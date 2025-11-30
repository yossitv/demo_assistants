import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductUploadForm from '@/components/ProductUploadForm';

describe('ProductUploadForm', () => {
  it('renders upload button', () => {
    render(<ProductUploadForm />);
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });

  it('displays file size limit', () => {
    render(<ProductUploadForm />);
    expect(screen.getByText(/max 10MB/i)).toBeInTheDocument();
  });

  it('shows accepted file types', () => {
    render(<ProductUploadForm />);
    expect(screen.getByText(/Markdown files only/i)).toBeInTheDocument();
  });

  it('shows drag and drop text', () => {
    render(<ProductUploadForm />);
    expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
  });

  it('has upload button', () => {
    render(<ProductUploadForm />);
    const buttons = screen.getAllByRole('button');
    const uploadButton = buttons.find(btn => btn.textContent === 'Upload');
    expect(uploadButton).toBeDefined();
  });
});
