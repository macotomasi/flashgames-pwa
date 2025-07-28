import { render, screen } from '@testing-library/react';
import TetrisGameComponent from './TetrisGame';
import '@testing-library/jest-dom';

test('affiche le score initial', () => {
  render(<TetrisGameComponent />);
  expect(screen.getByText(/Score/i)).toBeInTheDocument();
}); 