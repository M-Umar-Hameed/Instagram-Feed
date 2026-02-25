import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { uploadMediaToSupabase } from '../../utils/mediaUpload';

export default function CreatePostScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [posting, setPosting] = useState(false);

    const pickMedia = async (type: 'image' | 'video') => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please grant media library access to pick media.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'video'
                ? ImagePicker.MediaTypeOptions.Videos
                : ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: 60,
        });

        if (!result.canceled && result.assets[0]) {
            setMedia(result.assets[0]);
        }
    };

    const handlePost = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to post.');
            return;
        }

        if (!media && !caption.trim()) {
            Alert.alert('Error', 'Please add a caption or media.');
            return;
        }

        setPosting(true);
        try {
            let mediaUrls: any = null;
            let contentType = 'text';

            if (media) {
                contentType = media.type === 'video' ? 'video' : 'image';

                // Upload media
                try {
                    const result = await uploadMediaToSupabase(
                        media.uri,
                        'public-media',
                        `posts/${user.id}`
                    );

                    if (contentType === 'video') {
                        mediaUrls = {
                            videoUrl: result,
                            thumbnailUrl: result.replace(/\.\w+$/, '_thumb.jpg'), // Heuristic for thumbnail
                        };
                    } else {
                        mediaUrls = {
                            imageUrl: result
                        };
                    }
                } catch (uploadError: any) {
                    console.error('Upload error:', uploadError);
                    Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
                    setPosting(false);
                    return;
                }
            }

            // Create post in database matching the correct schema
            const { error } = await supabase.from('circle_posts').insert({
                user_id: user.id,
                content: { text: caption.trim() },
                media_urls: mediaUrls,
                content_type: contentType,
                created_at: new Date().toISOString(),
                likes_count: 0,
                comments_count: 0,
                shares_count: 0,
                views_count: 0,
                visibility: 'public',
                is_published: true
            } as any);

            if (error) {
                console.error('Post creation error:', error);
                Alert.alert('Error', 'Failed to create post. Please try again.');
            } else {
                // Invalidate feed cache so the new post shows up
                const { invalidateFeedCache } = require('../../hooks/useFeed');
                invalidateFeedCache();
                Alert.alert('Success', 'Post created!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (err: any) {
            console.error('Post error:', err);
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setPosting(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Post</Text>
                <TouchableOpacity
                    style={[styles.postButton, posting && styles.postButtonDisabled]}
                    onPress={handlePost}
                    disabled={posting}
                >
                    {posting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.postButtonText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {/* Caption */}
                <TextInput
                    style={styles.captionInput}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#666"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                />

                {/* Media Preview */}
                {media && (
                    <View style={styles.mediaPreview}>
                        <Image
                            source={{ uri: media.uri }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            style={styles.removeMedia}
                            onPress={() => setMedia(null)}
                        >
                            <Ionicons name="close-circle" size={28} color="#ff4444" />
                        </TouchableOpacity>
                        {media.type === 'video' && (
                            <View style={styles.videoBadge}>
                                <Ionicons name="videocam" size={16} color="#fff" />
                                <Text style={styles.videoBadgeText}>Video</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Media Picker Buttons */}
                {!media && (
                    <View style={styles.mediaButtons}>
                        <TouchableOpacity
                            style={styles.mediaButton}
                            onPress={() => pickMedia('image')}
                        >
                            <Ionicons name="image-outline" size={32} color="#4CAF50" />
                            <Text style={styles.mediaButtonText}>Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.mediaButton}
                            onPress={() => pickMedia('video')}
                        >
                            <Ionicons name="videocam-outline" size={32} color="#fe2c55" />
                            <Text style={styles.mediaButtonText}>Video</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.5%'),
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    headerButton: {
        padding: 4,
    },
    headerTitle: {
        color: '#fff',
        fontSize: wp('4.5%'),
        fontWeight: '700',
    },
    postButton: {
        backgroundColor: '#fe2c55',
        paddingHorizontal: wp('5%'),
        paddingVertical: hp('1%'),
        borderRadius: 8,
    },
    postButtonDisabled: {
        opacity: 0.5,
    },
    postButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: wp('3.5%'),
    },
    content: {
        flex: 1,
        padding: wp('4%'),
    },
    captionInput: {
        color: '#fff',
        fontSize: wp('4%'),
        minHeight: hp('15%'),
        marginBottom: hp('2%'),
    },
    mediaPreview: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: hp('2%'),
        position: 'relative',
    },
    mediaImage: {
        width: '100%',
        height: hp('30%'),
        borderRadius: 12,
    },
    removeMedia: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 14,
    },
    videoBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(254,44,85,0.9)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    mediaButtons: {
        flexDirection: 'row',
        gap: wp('4%'),
        marginTop: hp('2%'),
    },
    mediaButton: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: hp('3%'),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        gap: 8,
    },
    mediaButtonText: {
        color: '#ccc',
        fontSize: wp('3.5%'),
        fontWeight: '600',
    },
});
