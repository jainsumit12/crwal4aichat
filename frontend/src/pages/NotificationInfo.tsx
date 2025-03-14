import React from 'react';
import { createNotification, isNotificationsMuted, toggleNotificationsMuted } from '@/utils/notifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX } from 'lucide-react';

const NotificationInfo = () => {
  const [isMuted, setIsMuted] = React.useState(isNotificationsMuted());

  const handleToggleMute = () => {
    const newState = toggleNotificationsMuted();
    setIsMuted(newState);
  };

  const triggerSuccessNotification = () => {
    createNotification(
      'Success Notification',
      'This is an example of a success notification',
      'success',
      true
    );
  };

  const triggerErrorNotification = () => {
    createNotification(
      'Error Notification',
      'This is an example of an error notification',
      'error',
      true
    );
  };

  const triggerInfoNotification = () => {
    createNotification(
      'Info Notification',
      'This is an example of an info notification',
      'info',
      true
    );
  };

  const triggerPendingNotification = () => {
    createNotification(
      'Pending Notification',
      'This is an example of a pending notification',
      'pending',
      true
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Notification System Guide</h1>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What Triggers Notifications?</h2>
        <p className="mb-4">
          Notifications in this application are triggered by various events:
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">API Operations</h3>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>Starting a Crawl</strong> - When you start crawling a website, you'll see a notification.
          </li>
          <li>
            <strong>Search Operations</strong> - When you perform a search, you'll see notifications about the search progress.
          </li>
          <li>
            <strong>Setting a Profile</strong> - When you change your chat profile, a notification will appear.
          </li>
          <li>
            <strong>Clearing Chat History</strong> - When you clear your chat history, you'll be notified.
          </li>
        </ul>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Error Conditions</h3>
        <p className="mb-4">
          Error notifications are always shown when something goes wrong, such as:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Failed API requests</li>
          <li>Validation errors (e.g., missing required fields)</li>
          <li>Server errors</li>
        </ul>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Background Operations</h3>
        <p className="mb-4">
          Some operations run in the background and don't show notifications by default:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Loading sites (filtered out to reduce noise)</li>
          <li>Loading chat history</li>
          <li>Checking crawl status</li>
        </ul>
      </Card>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-gray-500" />
            ) : (
              <Volume2 className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <p className="font-medium">Mute Popup Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isMuted 
                  ? "Popup notifications are muted. You'll still see them in the notification center." 
                  : "Popup notifications are enabled. You'll see them appear in the corner of the screen."}
              </p>
            </div>
          </div>
          <Switch 
            checked={isMuted} 
            onCheckedChange={handleToggleMute} 
            aria-label="Toggle notification sounds"
          />
        </div>
        <p className="mb-4">
          You can control how notifications appear in the application:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>Popup Notifications</strong> - These appear in the corner of the screen and automatically disappear after a few seconds.
          </li>
          <li>
            <strong>Notification Center</strong> - All notifications are stored in the notification center, accessible from the bell icon in the top navigation bar.
          </li>
          <li>
            <strong>Mute Option</strong> - You can mute popup notifications while still keeping them in the notification center. This setting is saved in your browser and will persist between sessions.
          </li>
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Note: Error notifications will always appear in the notification center, even when muted, to ensure you don't miss important issues.
        </p>
      </Card>
      
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Notifications</h2>
        <p className="mb-4">
          You can test different types of notifications using these buttons:
        </p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <Button onClick={triggerSuccessNotification} className="bg-green-600 hover:bg-green-700">
            Success Notification
          </Button>
          <Button onClick={triggerErrorNotification} className="bg-red-600 hover:bg-red-700">
            Error Notification
          </Button>
          <Button onClick={triggerInfoNotification} className="bg-blue-600 hover:bg-blue-700">
            Info Notification
          </Button>
          <Button onClick={triggerPendingNotification} className="bg-yellow-600 hover:bg-yellow-700">
            Pending Notification
          </Button>
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Notification System Implementation</h2>
        <p className="mb-4">
          The notification system consists of several components:
        </p>
        
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            <strong>NotificationCenter</strong> - The component that displays notifications in the UI.
          </li>
          <li>
            <strong>notifications.ts</strong> - The utility that manages notification state and dispatches notifications.
          </li>
          <li>
            <strong>apiWrapper.ts</strong> - Wraps API calls with the notification system to show status updates.
          </li>
        </ul>
        
        <p className="mb-4">
          When an API call is made through the wrapper, it automatically creates:
        </p>
        <ol className="list-decimal pl-6 mb-4 space-y-2">
          <li>A "pending" notification when the call starts</li>
          <li>A "success" notification when the call completes successfully</li>
          <li>An "error" notification if the call fails</li>
        </ol>
        
        <p>
          You can also manually create notifications using the <code>createNotification</code> function,
          as demonstrated by the test buttons on this page.
        </p>
      </Card>
    </div>
  );
};

export default NotificationInfo; 