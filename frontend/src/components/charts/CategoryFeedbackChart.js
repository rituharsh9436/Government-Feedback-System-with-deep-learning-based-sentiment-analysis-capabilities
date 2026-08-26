import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

export const CategoryFeedbackChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[250px] bg-muted rounded-lg border border-border border-dashed">
        <p className="text-sm text-muted-foreground">No category data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="category" 
            stroke="#94a3b8" 
            fontSize={11}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="positive" name="Positive" stackId="a" fill={COLORS.positive} radius={[0, 0, 4, 4]} />
          <Bar dataKey="neutral" name="Neutral" stackId="a" fill={COLORS.neutral} />
          <Bar dataKey="negative" name="Negative" stackId="a" fill={COLORS.negative} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
