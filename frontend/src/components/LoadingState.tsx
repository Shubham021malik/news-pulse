import Spinner from './Spinner';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner className="h-10 w-10 mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
