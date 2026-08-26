import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const ConfidenceDistributionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[250px] bg-muted rounded-lg border border-border border-dashed">
        <p className="text-sm text-muted-foreground">No confidence distribution data available.</p>
      </div>
    );
  }

  // Format data for display
  const formattedData = data.map(item => ({
    ...item,
    // Add display name for the score bin (e.g., "0.8")
    scoreLabel: item.score.toFixed(1)
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="scoreLabel" 
            label={{ value: 'Confidence Score', position: 'insideBottom', offset: -10 }} 
          />
          <YAxis label={{ value: 'Feedback Count', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value) => [value, 'Count']}
            labelFormatter={(label) => `Confidence: ~${label}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {formattedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                // Color low confidence as warning
                fill={entry.score <= 0.6 ? '#f59e0b' : '#3b82f6'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConfidenceDistributionChart;
