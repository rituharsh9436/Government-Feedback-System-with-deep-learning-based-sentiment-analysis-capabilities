import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SentimentScoreChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[250px] bg-slate-50 rounded-lg border border-slate-100 border-dashed">
        <p className="text-sm text-slate-400">No sentiment score data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="score_bin" 
            stroke="#94a3b8" 
            fontSize={11}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
          <Tooltip 
            formatter={(value) => [value, 'Comments']}
            labelFormatter={(label) => `Confidence: ~${label}`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
