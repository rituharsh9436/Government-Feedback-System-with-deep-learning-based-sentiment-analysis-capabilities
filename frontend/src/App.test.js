import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('requires Aadhaar for public signups but not government signups', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /new here\? register/i }));

  expect(screen.getByLabelText(/aadhaar number/i)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'govt' } });

  expect(screen.queryByLabelText(/aadhaar number/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/department name/i)).toBeInTheDocument();
});
