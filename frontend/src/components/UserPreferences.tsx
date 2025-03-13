import React, { useState, useEffect } from 'react';
import { apiService, UserPreference } from '../api/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'react-hot-toast';

interface UserPreferencesProps {
  userId: string;
  sessionId?: string;
  onPreferenceChange?: () => void;
}

const UserPreferences: React.FC<UserPreferencesProps> = ({ userId, sessionId, onPreferenceChange }) => {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPreference, setNewPreference] = useState({
    type: 'like',
    value: '',
    context: 'Manually added via UI',
    confidence: 0.9
  });
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [activeOnly, setActiveOnly] = useState(true);

  const preferenceTypes = [
    { value: 'like', label: 'Like' },
    { value: 'dislike', label: 'Dislike' },
    { value: 'expertise', label: 'Expertise' },
    { value: 'interest', label: 'Interest' },
    { value: 'characteristic', label: 'Characteristic' },
    { value: 'opinion', label: 'Opinion' }
  ];

  const loadPreferences = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const prefs = await apiService.getUserPreferences(userId, minConfidence, activeOnly);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [userId, minConfidence, activeOnly]);

  const handleAddPreference = async () => {
    if (!newPreference.value.trim()) {
      toast.error('Preference value cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.addUserPreference(
        userId,
        newPreference.type,
        newPreference.value,
        newPreference.context,
        newPreference.confidence,
        sessionId
      );

      if (result) {
        toast.success('Preference added successfully');
        setNewPreference({
          ...newPreference,
          value: ''
        });
        loadPreferences();
        if (onPreferenceChange) onPreferenceChange();
      } else {
        toast.error('Failed to add preference');
      }
    } catch (error) {
      console.error('Error adding preference:', error);
      toast.error('Failed to add preference');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreference = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this preference?')) {
      return;
    }

    setLoading(true);
    try {
      const success = await apiService.deleteUserPreference(userId, id);
      if (success) {
        toast.success('Preference deleted successfully');
        loadPreferences();
        if (onPreferenceChange) onPreferenceChange();
      } else {
        toast.error('Failed to delete preference');
      }
    } catch (error) {
      console.error('Error deleting preference:', error);
      toast.error('Failed to delete preference');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePreference = async (id: number) => {
    setLoading(true);
    try {
      const success = await apiService.deactivateUserPreference(userId, id);
      if (success) {
        toast.success('Preference deactivated successfully');
        loadPreferences();
        if (onPreferenceChange) onPreferenceChange();
      } else {
        toast.error('Failed to deactivate preference');
      }
    } catch (error) {
      console.error('Error deactivating preference:', error);
      toast.error('Failed to deactivate preference');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPreferences = async () => {
    if (!window.confirm('Are you sure you want to clear all preferences? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const success = await apiService.clearUserPreferences(userId);
      if (success) {
        toast.success('All preferences cleared successfully');
        loadPreferences();
        if (onPreferenceChange) onPreferenceChange();
      } else {
        toast.error('Failed to clear preferences');
      }
    } catch (error) {
      console.error('Error clearing preferences:', error);
      toast.error('Failed to clear preferences');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="user-preferences p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">User Preferences</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={loadPreferences} 
            variant="outline"
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            onClick={handleClearPreferences} 
            variant="destructive"
            disabled={loading || preferences.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="filter-controls mb-4 flex flex-wrap gap-4">
        <div className="flex items-center">
          <label className="mr-2">Min Confidence:</label>
          <Select
            value={minConfidence.toString()}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            disabled={loading}
            className="w-24"
          >
            <option value="0">All (0.0)</option>
            <option value="0.5">0.5</option>
            <option value="0.7">0.7</option>
            <option value="0.8">0.8</option>
            <option value="0.9">0.9</option>
          </Select>
        </div>
        <div className="flex items-center">
          <label className="mr-2">Show:</label>
          <Select
            value={activeOnly ? "active" : "all"}
            onChange={(e) => setActiveOnly(e.target.value === "active")}
            disabled={loading}
            className="w-32"
          >
            <option value="active">Active Only</option>
            <option value="all">All Preferences</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      ) : preferences.length === 0 ? (
        <div className="text-center my-8 p-4 bg-gray-100 rounded-md">
          <p>No preferences found. Add your first preference below.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.map((pref) => (
                <TableRow key={pref.id}>
                  <TableCell>
                    <Badge variant={pref.preference_type === 'like' ? 'success' : 
                                    pref.preference_type === 'dislike' ? 'destructive' : 
                                    'secondary'}>
                      {pref.preference_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{pref.preference_value}</TableCell>
                  <TableCell>{(pref.confidence * 100).toFixed(0)}%</TableCell>
                  <TableCell className="max-w-xs truncate" title={pref.context}>
                    {pref.context || 'N/A'}
                  </TableCell>
                  <TableCell>{formatDate(pref.created_at)}</TableCell>
                  <TableCell>{formatDate(pref.last_used)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivatePreference(pref.id!)}
                        disabled={loading || !pref.is_active}
                      >
                        Deactivate
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePreference(pref.id!)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="add-preference mt-6">
        <h3 className="text-lg font-semibold mb-2">Add New Preference</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-1">Type</label>
            <Select
              value={newPreference.type}
              onChange={(e) => setNewPreference({ ...newPreference, type: e.target.value })}
              disabled={loading}
              className="w-full"
            >
              {preferenceTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block mb-1">Value</label>
            <Input
              type="text"
              value={newPreference.value}
              onChange={(e) => setNewPreference({ ...newPreference, value: e.target.value })}
              disabled={loading}
              placeholder="Enter preference value"
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Confidence</label>
            <Select
              value={newPreference.confidence.toString()}
              onChange={(e) => setNewPreference({ ...newPreference, confidence: parseFloat(e.target.value) })}
              disabled={loading}
              className="w-full"
            >
              <option value="0.7">70%</option>
              <option value="0.8">80%</option>
              <option value="0.9">90%</option>
              <option value="1">100%</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddPreference}
              disabled={loading || !newPreference.value.trim()}
              className="w-full"
            >
              Add Preference
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPreferences; 