import { useState, useEffect } from 'react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useCreatePolicy } from '../../hooks/usePolicies';

const EMPTY_POLICY = { title: '', description: '', category: '', location: '' };

export const PolicyForm = ({ initialPolicy, onSuccess, onCancel }) => {
  const [form, setForm] = useState(initialPolicy || EMPTY_POLICY);
  const { mutate: createPolicy, isPending } = useCreatePolicy();

  useEffect(() => {
    setForm(initialPolicy || EMPTY_POLICY);
  }, [initialPolicy]);

  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    createPolicy(form, {
      onSuccess: () => {
        setForm(EMPTY_POLICY);
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <form className="card mb-6" onSubmit={handleSubmit}>
      <h2 className="mb-4">
        {initialPolicy ? 'Repost policy with updates' : 'Publish a policy'}
      </h2>
      
      {initialPolicy && (
        <p className="notice notice-success mb-4">
          This creates a new policy; the original policy remains unchanged.
        </p>
      )}

      <div className="flex gap-4 mb-4">
        <Input 
          className="flex-1"
          label="Title" 
          required 
          value={form.title} 
          onChange={(e) => update('title', e.target.value)} 
        />
        <Input 
          className="flex-1"
          label="Category" 
          required 
          value={form.category} 
          onChange={(e) => update('category', e.target.value)} 
        />
        <Input 
          className="flex-1"
          label="Location" 
          required 
          value={form.location} 
          onChange={(e) => update('location', e.target.value)} 
        />
      </div>

      <div className="form-group mb-4">
        <label className="form-label">Description</label>
        <textarea 
          className="form-input" 
          required 
          minLength="10" 
          rows="5"
          value={form.description} 
          onChange={(e) => update('description', e.target.value)} 
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" isLoading={isPending}>
          {initialPolicy ? 'Save changes' : 'Publish policy'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
