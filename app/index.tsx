import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { DevNoteModal } from '@/components/DevNoteModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InitialListSelectionModal } from '@/components/InitialListSelectionModal';

export default function Index() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const [showDevNote, setShowDevNote] = useState(false);
  const [isDevNoteStatusLoading, setIsDevNoteStatusLoading] = useState(true);
  const [showListSelection, setShowListSelection] = useState(false);
  const [isListSelectionLoading, setIsListSelectionLoading] = useState(true);
  const [hasCompletedInitialSetup, setHasCompletedInitialSetup] = useState(false);

  console.log('Index - User:', user?.email, 'Confirmed:', user?.email_confirmed_at, 'Loading:', loading);

  const theme = {
    text: '#f0f0f0',
    background: isDark ? '#0B0909' : '#003C24',
    primary: isDark ? '#8C8C8C' : '#f0f0f0',
  };

  // Check dev note status every time user authentication status changes
  useEffect(() => {
    if (user?.email_confirmed_at) {
      console.log('🔍 DEBUG: User is authenticated and confirmed, checking dev note status');
      checkListSelectionStatus();
    } else {
      // User is not confirmed, don't show dev note and clear loading state
      setShowDevNote(false);
      setIsDevNoteStatusLoading(false);
      setShowListSelection(false);
      setIsListSelectionLoading(false);
      setHasCompletedInitialSetup(false);
    }
  }, [user?.email_confirmed_at]);

  const checkDevNoteStatus = async () => {
    try {
      setIsDevNoteStatusLoading(true);
      console.log('🔍 DEBUG: Checking dev note status...');
      const dontShowDevNote = await AsyncStorage.getItem('do_not_show_dev_note_again');
      console.log('🔍 DEBUG: AsyncStorage value for do_not_show_dev_note_again:', dontShowDevNote);
      if (dontShowDevNote !== 'true') {
        console.log('🔍 DEBUG: Should show dev note, setting showDevNote to true');
        setShowDevNote(true);
      } else {
        console.log('🔍 DEBUG: User opted out, not showing dev note');
        setShowDevNote(false);
      }
      console.log('🔍 DEBUG: Dev note check completed');
    } catch (error) {
      console.error('Error checking dev note status:', error);
      setShowDevNote(false);
    } finally {
      setIsDevNoteStatusLoading(false);
    }
  };

  const checkListSelectionStatus = async () => {
    try {
      setIsListSelectionLoading(true);
      console.log('🔍 DEBUG: Checking list selection status...');
      console.log('🔍 DEBUG: User isPro:', user?.isPro);
      console.log('🔍 DEBUG: User selectedListType:', user?.selectedListType);
      
      // Check if user has completed initial setup
      const hasCompletedSetup = await AsyncStorage.getItem('has_completed_initial_setup');
      console.log('🔍 DEBUG: Has completed setup:', hasCompletedSetup);
      
      // Only show list selection for free users who haven't selected a list yet AND haven't completed setup
      if (!user?.isPro && !user?.selectedListType && hasCompletedSetup !== 'true') {
        console.log('🔍 DEBUG: Should show list selection modal');
        setShowListSelection(true);
      } else {
        console.log('🔍 DEBUG: User is pro, has selected a list, or has completed setup');
        setShowListSelection(false);
        setHasCompletedInitialSetup(true);
        // Now check dev note status
        checkDevNoteStatus();
      }
    } catch (error) {
      console.error('Error checking list selection status:', error);
      setShowListSelection(false);
      setHasCompletedInitialSetup(true);
      checkDevNoteStatus();
    } finally {
      setIsListSelectionLoading(false);
    }
  };

  const handleDevNoteClose = async (dontShowAgain: boolean) => {
    console.log('🔍 DEBUG: Dev note closing, dontShowAgain:', dontShowAgain);
    try {
      if (dontShowAgain) {
        console.log('🔍 DEBUG: Setting do_not_show_dev_note_again to true');
        await AsyncStorage.setItem('do_not_show_dev_note_again', 'true');
      }
      setShowDevNote(false);
      console.log('🔍 DEBUG: Dev note closed');
    } catch (error) {
      console.error('Error saving dev note preference:', error);
      setShowDevNote(false);
    }
  };

  const handleListSelectionClose = () => {
    console.log('🔍 DEBUG: List selection modal closed');
    setShowListSelection(false);
    setHasCompletedInitialSetup(true);
    // Mark initial setup as completed
    AsyncStorage.setItem('has_completed_initial_setup', 'true');
    // After list selection, check dev note status
    checkDevNoteStatus();
  };

  if (loading || isDevNoteStatusLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading ARMi...
        </Text>
      </View>
    );
  }

  if (user && user.email_confirmed_at) {
    // If list selection should be shown, show that modal first
    if (showListSelection && !isListSelectionLoading) {
      console.log('🔍 DEBUG: Showing list selection modal');
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <InitialListSelectionModal
            visible={showListSelection}
            onClose={handleListSelectionClose}
            theme={theme}
          />
        </View>
      );
    }
    
    // If dev note should be shown, show the modal
    if (showDevNote) {
      console.log('🔍 DEBUG: Showing dev note modal');
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <DevNoteModal
            visible={showDevNote}
            onClose={handleDevNoteClose}
          />
        </View>
      );
    }
    
    console.log('🔍 DEBUG: All modals handled, redirecting to main app');
    // Dev note has been handled or user opted out, redirect to main app
    return <Redirect href="/(tabs)" />;
  }

  if (user && !user.email_confirmed_at) {
    return <Redirect href="/auth/verify-email" />;
  }

  return <Redirect href="/auth/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});