import Link from "next/link";

const DEFAULT_ERRORPAGE_MESSAGES = {
  404: "The requested resource was not found.",
  403: "You do not have permission to access this resource.",
  401: "You are not authenticated.",
  500: "An internal server error occurred.",
};

const DEFAULT_FALLBACK_MESSAGE = "An unexpected error occurred.";

interface ErrorPageProps {
  errorCode: number;
  message?: string;
}

export default function ErrorPage({ errorCode, message }: ErrorPageProps) {
  if (!message) {
    message = DEFAULT_ERRORPAGE_MESSAGES[errorCode] || DEFAULT_FALLBACK_MESSAGE;
  }

  return (
    <div className="flex items-center justify-center h-full flex-col text-center p-4">
      <div className="prose text-center">
        {errorCode &&
          <h1 className="text-4xl font-bold">Error {errorCode}</h1>
        }
        <p className="text-lg text-base-content/80 mt-2">
          {message}
        </p>
        <div className="mt-6">
          <Link href="/" className="btn btn-primary">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
