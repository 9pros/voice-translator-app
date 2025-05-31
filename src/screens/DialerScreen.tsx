import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Contacts from 'react-native-contacts';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from '../context/TranslationContext';
import {Contact} from '../types';

const DialerScreen: React.FC = () => {
  const navigation = useNavigation();
  const {state: translationState} = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasContactsPermission, setHasContactsPermission] = useState(false);

  useEffect(() => {
    requestContactsPermission();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts.slice(0, 10)); // Show first 10 contacts
    } else {
      const filtered = contacts.filter(
        contact =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phoneNumber.includes(searchQuery),
      );
      setFilteredContacts(filtered.slice(0, 10));
    }
  }, [searchQuery, contacts]);

  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to show them in the dialer.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasContactsPermission(true);
          loadContacts();
        }
      } else {
        // iOS permission handling
        Contacts.checkPermission().then(permission => {
          if (permission === 'undefined') {
            Contacts.requestPermission().then(permission => {
              if (permission === 'authorized') {
                setHasContactsPermission(true);
                loadContacts();
              }
            });
          } else if (permission === 'authorized') {
            setHasContactsPermission(true);
            loadContacts();
          }
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsData = await Contacts.getAll();
      const formattedContacts: Contact[] = contactsData
        .filter(contact => contact.phoneNumbers.length > 0)
        .map(contact => ({
          id: contact.recordID,
          name: `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Unknown',
          phoneNumber: contact.phoneNumbers[0]?.number || '',
        }))
        .slice(0, 50); // Limit to 50 contacts for performance

      setContacts(formattedContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleNumberPress = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber('');
  };

  const handleCall = (number?: string) => {
    const numberToCall = number || phoneNumber;
    
    if (!numberToCall.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    Alert.alert(
      'Start Translation Call',
      `Call ${numberToCall} with real-time translation?\n\nFrom: ${translationState.sourceLanguage.name}\nTo: ${translationState.targetLanguage.name}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Call',
          onPress: () => {
            // Navigate to call screen with translation enabled
            navigation.navigate('Call' as never, {
              phoneNumber: numberToCall,
              translationEnabled: true,
            } as never);
          },
        },
      ],
    );
  };

  const handleRegularCall = (number?: string) => {
    const numberToCall = number || phoneNumber;
    
    if (!numberToCall.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const phoneUrl = `tel:${numberToCall}`;
    Linking.openURL(phoneUrl).catch(err => {
      console.error('Failed to make call:', err);
      Alert.alert('Error', 'Failed to make call');
    });
  };

  const handleContactPress = (contact: Contact) => {
    setPhoneNumber(contact.phoneNumber);
    setSearchQuery('');
  };

  const DialerButton: React.FC<{
    digit: string;
    letters?: string;
    onPress: () => void;
  }> = ({digit, letters, onPress}) => (
    <TouchableOpacity style={styles.dialerButton} onPress={onPress}>
      <Text style={styles.dialerDigit}>{digit}</Text>
      {letters && <Text style={styles.dialerLetters}>{letters}</Text>}
    </TouchableOpacity>
  );

  const ContactItem: React.FC<{contact: Contact}> = ({contact}) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(contact)}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactNumber}>{contact.phoneNumber}</Text>
      </View>
      <TouchableOpacity
        style={styles.contactCallButton}
        onPress={() => handleCall(contact.phoneNumber)}>
        <Icon name="call" size={20} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        <Text style={styles.headerTitle}>Translation Dialer</Text>
        <Text style={styles.headerSubtitle}>
          {translationState.sourceLanguage.flag} → {translationState.targetLanguage.flag}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search and Number Input */}
        <View style={styles.inputSection}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts or enter number"
              value={searchQuery || phoneNumber}
              onChangeText={text => {
                if (/^\d*$/.test(text)) {
                  setPhoneNumber(text);
                  setSearchQuery('');
                } else {
                  setSearchQuery(text);
                  setPhoneNumber('');
                }
              }}
              keyboardType="phone-pad"
            />
            {(searchQuery || phoneNumber) && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setPhoneNumber('');
                }}
                style={styles.clearButton}>
                <Icon name="clear" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {phoneNumber && (
            <View style={styles.numberDisplay}>
              <Text style={styles.numberText}>{phoneNumber}</Text>
            </View>
          )}
        </View>

        {/* Contacts List */}
        {searchQuery && filteredContacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>Contacts</Text>
            <View style={styles.contactsList}>
              {filteredContacts.map(contact => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </View>
          </View>
        )}

        {/* Dialer Pad */}
        <View style={styles.dialerSection}>
          <Text style={styles.sectionTitle}>Dialer</Text>
          <View style={styles.dialerPad}>
            <View style={styles.dialerRow}>
              <DialerButton digit="1" onPress={() => handleNumberPress('1')} />
              <DialerButton digit="2" letters="ABC" onPress={() => handleNumberPress('2')} />
              <DialerButton digit="3" letters="DEF" onPress={() => handleNumberPress('3')} />
            </View>
            <View style={styles.dialerRow}>
              <DialerButton digit="4" letters="GHI" onPress={() => handleNumberPress('4')} />
              <DialerButton digit="5" letters="JKL" onPress={() => handleNumberPress('5')} />
              <DialerButton digit="6" letters="MNO" onPress={() => handleNumberPress('6')} />
            </View>
            <View style={styles.dialerRow}>
              <DialerButton digit="7" letters="PQRS" onPress={() => handleNumberPress('7')} />
              <DialerButton digit="8" letters="TUV" onPress={() => handleNumberPress('8')} />
              <DialerButton digit="9" letters="WXYZ" onPress={() => handleNumberPress('9')} />
            </View>
            <View style={styles.dialerRow}>
              <DialerButton digit="*" onPress={() => handleNumberPress('*')} />
              <DialerButton digit="0" onPress={() => handleNumberPress('0')} />
              <DialerButton digit="#" onPress={() => handleNumberPress('#')} />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.backspaceButton}
              onPress={handleBackspace}
              onLongPress={handleClear}>
              <Icon name="backspace" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Call Buttons */}
        <View style={styles.callButtons}>
          <TouchableOpacity
            style={styles.regularCallButton}
            onPress={() => handleRegularCall()}>
            <Icon name="call" size={24} color="white" />
            <Text style={styles.callButtonText}>Regular Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.translationCallButton}
            onPress={() => handleCall()}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.callButtonGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <Icon name="translate" size={24} color="white" />
              <Text style={styles.callButtonText}>Translation Call</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  clearButton: {
    padding: 5,
  },
  numberDisplay: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1C1C1E',
    letterSpacing: 2,
  },
  contactsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  contactsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  contactInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  contactNumber: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  contactCallButton: {
    padding: 10,
  },
  dialerSection: {
    marginBottom: 20,
  },
  dialerPad: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dialerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dialerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dialerDigit: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  dialerLetters: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButtons: {
    alignItems: 'center',
    marginTop: 10,
  },
  backspaceButton: {
    padding: 15,
  },
  callButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  regularCallButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  translationCallButton: {
    flex: 1,
    marginLeft: 10,
  },
  callButtonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default DialerScreen;

