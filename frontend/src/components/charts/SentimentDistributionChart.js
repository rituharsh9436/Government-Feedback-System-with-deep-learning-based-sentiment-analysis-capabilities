import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  Positive: '#10b981', // green-500
  Negative: '#ef4444', // red-500
  Neutral: '#94a3b8',  // slate-400
};

const SentimentDistributionChart = ({ data }) => {
  // data should be [{ name: 'Positive', value: X }, ...]
  
  const hasData = data && data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[250px] bg-slate-50 rounded-lg border border-slate-100 border-dashed">
        <p className="text-sm text-slate-400">No sentiment data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [value, 'Comments']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentDistributionChart;
