import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { colors } from '../utils/theme';

interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  isOwnPost: boolean;
  canEdit?: boolean; // Some posts might not be editable (e.g., too old)
  hasAlreadyReported?: boolean; // Whether user has already reported this post
}

const PostOptionsModal: React.FC<PostOptionsModalProps> = ({
  visible,
  onClose,
  onDelete,
  onEdit,
  onReport,
  isOwnPost,
  canEdit = true,
  hasAlreadyReported = false,
}) => {
  const openTimeRef = React.useRef<number>(0);

  // Track when modal opens to prevent immediate closure
  React.useEffect(() => {
    if (visible) {
      openTimeRef.current = Date.now();
    }
  }, [visible]);

  const handleClose = () => {
    // Prevent closing if modal was just opened (within 300ms)
    const timeSinceOpen = Date.now() - openTimeRef.current;
    if (timeSinceOpen < 300) {
      console.log('[PostOptionsModal] Ignoring close - modal just opened');
      return;
    }
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onClose();
            onDelete();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    onClose();
    if (onEdit) {
      onEdit();
    }
  };

  const handleReport = () => {
    console.log('[PostOptionsModal] Report option tapped');
    // First close this modal
    onClose();
    // Then open report modal with a small delay to prevent conflicts
    setTimeout(() => {
      if (onReport) {
        console.log('[PostOptionsModal] Calling onReport after modal close');
        onReport();
      }
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.modalContent}>
              <View style={styles.handle} />

              {/* Edit Option - Only for own posts */}
              {isOwnPost && canEdit && onEdit && (
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={24} color={colors.primary} />
                  <Text style={styles.editText}>Edit Post</Text>
                </TouchableOpacity>
              )}

              {/* Delete Option - Only for own posts */}
              {isOwnPost && (
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  <Text style={styles.deleteText}>Delete Post</Text>
                </TouchableOpacity>
              )}

              {/* Report Option - Only for other users' posts */}
              {!isOwnPost && onReport && (
                hasAlreadyReported ? (
                  <View style={[styles.option, styles.disabledOption]}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <View style={styles.reportedTextContainer}>
                      <Text style={styles.alreadyReportedText}>Already Reported</Text>
                      <Text style={styles.reviewingText}>Our moderators are reviewing this post</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={handleReport}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flag-outline" size={24} color="#FF9800" />
                    <Text style={styles.reportText}>Report Post</Text>
                  </TouchableOpacity>
                )
              )}

              {/* Cancel Option */}
              <TouchableOpacity
                style={[styles.option, styles.cancelOption]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#000" />
                <Text style={styles.optionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    paddingBottom: hp('4%'),
    paddingTop: hp('1%'),
  },
  handle: {
    width: wp('15%'),
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: hp('2%'),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: wp('4%'),
    marginLeft: wp('3%'),
    color: '#000',
    fontWeight: '500',
  },
  editText: {
    fontSize: wp('4%'),
    marginLeft: wp('3%'),
    color: colors.primary,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: wp('4%'),
    marginLeft: wp('3%'),
    color: '#FF3B30',
    fontWeight: '600',
  },
  reportText: {
    fontSize: wp('4%'),
    marginLeft: wp('3%'),
    color: '#FF9800',
    fontWeight: '600',
  },
  disabledOption: {
    opacity: 0.8,
    backgroundColor: '#F5FFF5',
  },
  reportedTextContainer: {
    marginLeft: wp('3%'),
    flex: 1,
  },
  alreadyReportedText: {
    fontSize: wp('4%'),
    color: '#4CAF50',
    fontWeight: '600',
  },
  reviewingText: {
    fontSize: wp('3%'),
    color: '#888',
    marginTop: hp('0.3%'),
  },
});

export default PostOptionsModal;
