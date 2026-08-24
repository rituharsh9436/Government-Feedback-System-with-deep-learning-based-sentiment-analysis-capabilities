import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const FeedbackOverTimeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[250px] bg-slate-50 rounded-lg border border-slate-100 border-dashed">
        <p className="text-sm text-slate-400">No timeline data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
              const d = new Date(tick);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            stroke="#94a3b8" 
            fontSize={12}
            tickMargin={10}
          />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            formatter={(value) => [value, 'Comments']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
