/**
 * Integration tests for workflow builder page load functionality
 * 
 * Tests cover:
 * - Loading workflow from API when workflowId is provided
 * - Passing loaded data to WorkflowBuilder component
 * - Handling empty workflow (no workflowId)
 * - Error handling when workflow fetch fails
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilderPage from '@/app/dashboard/workflow-builder/page';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useSearchParams: jest.fn(),
}));
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

// Mock WorkflowBuilder component
jest.mock('@/components/WorkflowBuilder', () => {
  return function MockWorkflowBuilder(props: any) {
    return (
      <div data-testid="workflow-builder">
        <div data-testid="company-id">{props.companyId}</div>
        <div data-testid="workflow-id">{props.workflowId || 'none'}</div>
        <div data-testid="workflow-name">{props.workflowName || 'none'}</div>
        <div data-testid="workflow-description">{props.initialDescription || 'none'}</div>
        <div data-testid="nodes-count">{props.initialNodes?.length || 0}</div>
        <div data-testid="edges-count">{props.initialEdges?.length || 0}</div>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('WorkflowBuilderPage Load Functionality', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      companyId: 'company-123',
    },
    expires: '2024-12-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders loading state while fetching workflow', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    // Mock fetch to delay response
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          _id: 'workflow-123',
          name: 'Test Workflow',
          description: 'Test Description',
          nodes: [],
          edges: [],
        }),
      }), 100))
    );

    render(<WorkflowBuilderPage />);

    // Should show loading spinner initially
    expect(screen.getByText((content, element) => {
      return element?.className?.includes('animate-spin') || false;
    })).toBeInTheDocument();
  });

  it('loads workflow from API when workflowId is provided', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    const mockWorkflow = {
      _id: 'workflow-123',
      name: 'Approval Workflow',
      description: 'Standard approval process',
      nodes: [
        {
          id: 'node_1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
        },
        {
          id: 'node_2',
          type: 'end',
          position: { x: 200, y: 200 },
          data: { label: 'End' },
        },
      ],
      edges: [
        {
          id: 'edge_1',
          source: 'node_1',
          target: 'node_2',
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorkflow,
    });

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/workflows/workflow-123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-id')).toHaveTextContent('workflow-123');
      expect(screen.getByTestId('workflow-name')).toHaveTextContent('Approval Workflow');
      expect(screen.getByTestId('workflow-description')).toHaveTextContent('Standard approval process');
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
    });
  });

  it('renders empty workflow when no workflowId is provided', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    } as any);

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-id')).toHaveTextContent('none');
      expect(screen.getByTestId('workflow-name')).toHaveTextContent('none');
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('0');
      expect(screen.getByTestId('edges-count')).toHaveTextContent('0');
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles workflow fetch error gracefully', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/workflows/workflow-123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load workflow');
    });

    consoleSpy.mockRestore();
  });

  it('handles network error during workflow fetch', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/workflows/workflow-123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading workflow:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('loads workflow with empty nodes and edges arrays', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    const mockWorkflow = {
      _id: 'workflow-123',
      name: 'Empty Workflow',
      description: 'Workflow with no nodes',
      nodes: [],
      edges: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorkflow,
    });

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-name')).toHaveTextContent('Empty Workflow');
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('0');
      expect(screen.getByTestId('edges-count')).toHaveTextContent('0');
    });
  });

  it('loads workflow without description', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn((key: string) => (key === 'id' ? 'workflow-123' : null)),
    } as any);

    const mockWorkflow = {
      _id: 'workflow-123',
      name: 'Workflow Without Description',
      nodes: [
        {
          id: 'node_1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start' },
        },
      ],
      edges: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorkflow,
    });

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-name')).toHaveTextContent('Workflow Without Description');
      expect(screen.getByTestId('workflow-description')).toHaveTextContent('none');
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('1');
    });
  });

  it('passes companyId from session to WorkflowBuilder', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    } as any);

    render(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workflow-builder')).toBeInTheDocument();
      expect(screen.getByTestId('company-id')).toHaveTextContent('company-123');
    });
  });
});
