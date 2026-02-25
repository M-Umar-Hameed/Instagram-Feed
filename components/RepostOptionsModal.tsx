
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { colors } from '../utils/theme';
import { Database } from '../database.types';

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface RepostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  post: CirclePost;
  user: User;
  onRepost: (type: 'simple' | 'quote', comment?: string) => Promise<void>;
  onShare: () => Promise<void>;
  isLoading?: boolean;
}

const RepostOptionsModal: React.FC<RepostOptionsModalProps> = ({
  visible,
  onClose,
  post,
  user,
  onRepost,
  onShare,
  isLoading = false,
}) => {
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setProcessing(false);
    }
  }, [visible]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSimpleRepost = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      await onRepost('simple');

      onClose();

      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Post reposted to your profile!',
          position: 'top',
          topOffset: 60,
        });
      }, 300);
    } catch (error) {
      console.error('Simple repost error:', error);
      setProcessing(false);
      Alert.alert('Error', 'Failed to repost. Please try again.');
    }
  };

  const handleExternalShare = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      await onShare();
      onClose();
    } catch (error) {
      console.error('External share error:', error);
      setProcessing(false);
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
  };


  const renderOptionsView = () => (
    <View style={styles.options}>
      {/* V1: Repost feature commented out - to be reintroduced in later versions */}
      {/* <TouchableOpacity
        style={styles.option}
        onPress={handleSimpleRepost}
        disabled={processing || isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.optionIcon}>
          <Ionicons name="repeat" size={wp('7%')} color="#000" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Repost</Text>
          <Text style={styles.optionDescription}>
            Share this post to your profile
          </Text>
        </View>
        {processing && <ActivityIndicator size="small" color={colors.primary} />}
      </TouchableOpacity> */}


      {/* Share Externally */}
      <TouchableOpacity
        style={styles.option}
        onPress={handleExternalShare}
        disabled={processing || isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.optionIcon}>
          <Ionicons name="share-social-outline" size={wp('7%')} color="#000" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Share Externally</Text>
          <Text style={styles.optionDescription}>
            Share via WhatsApp, Messages, etc.
          </Text>
        </View>
        {processing && <ActivityIndicator size="small" color={colors.primary} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />

          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Share Post</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                disabled={processing}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {renderOptionsView()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    paddingBottom: hp('3%'),
    maxHeight: hp('80%'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    flex: 1,
    fontSize: wp('5%'),
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  closeButton: {
    padding: wp('1%'),
  },
  options: {
    padding: wp('5%'),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionIcon: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('4%'),
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#000',
    marginBottom: hp('0.5%'),
  },
  optionDescription: {
    fontSize: wp('3.5%'),
    color: '#666',
  },
});

export default RepostOptionsModal;
