import { useState, type FC, type FormEvent } from 'react';
import { Button } from './Button';
import { apiClient } from '../api/client';

export const AskJarvis: FC = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    try {
      const result = await apiClient.askJarvis(question);
      setResponse(result.response);
    } catch (err) {
      setResponse('Failed to get response from JARVIS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ask JARVIS</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to know?
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            rows={4}
            placeholder="e.g., Which users should I consider removing?"
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask JARVIS'}
        </Button>
      </form>

      {response && (
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <h3 className="font-semibold mb-2">Response:</h3>
          <p className="whitespace-pre-wrap text-sm">{response}</p>
        </div>
      )}
    </div>
  );
};
