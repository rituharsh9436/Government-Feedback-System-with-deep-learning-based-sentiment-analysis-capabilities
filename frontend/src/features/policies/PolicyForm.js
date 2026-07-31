import { useState, useEffect } from 'react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useCreatePolicy } from '../../hooks/usePolicies';
import toast from 'react-hot-toast';
import { FileEdit, Info } from 'lucide-react';

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
        toast.success(initialPolicy ? 'Policy reposted successfully' : 'Policy published successfully');
        if (onSuccess) onSuccess();
      },
      onError: (err) => {
        toast.error(err.message || 'Error publishing policy');
      }
    });
  };

  return (
    <form className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
        <FileEdit className="w-5 h-5 text-primary-600" />
        {initialPolicy ? 'Repost policy with updates' : 'Publish a new policy'}
      </h2>
      
      {initialPolicy && (
        <div className="mb-6 rounded-md bg-sky-50 p-4 border border-sky-100 flex items-start">
          <Info className="h-5 w-5 text-sky-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-sky-800">
            This creates a new policy; the original policy and its comments remain unchanged.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5 mb-5">
        <Input 
          className="flex-1"
          label="Policy Title" 
          required 
          value={form.title} 
          onChange={(e) => update('title', e.target.value)} 
          placeholder="e.g. New Transit Initiative"
        />
        <Input 
          className="flex-1 md:max-w-xs"
          label="Category" 
          required 
          value={form.category} 
          onChange={(e) => update('category', e.target.value)} 
          placeholder="e.g. Transportation"
        />
        <Input 
          className="flex-1 md:max-w-xs"
          label="Location" 
          required 
          value={form.location} 
          onChange={(e) => update('location', e.target.value)} 
          placeholder="e.g. District 1"
        />
      </div>

      <div className="flex flex-col space-y-1.5 w-full mb-6">
        <label className="text-sm font-medium leading-none text-slate-700">Detailed Description</label>
        <textarea 
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          required 
          minLength="10" 
          value={form.description} 
          onChange={(e) => update('description', e.target.value)} 
          placeholder="Provide comprehensive details about the proposed policy changes..."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" isLoading={isPending} className="px-6">
          {initialPolicy ? 'Publish Updates' : 'Publish Policy'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
