import ErrorPage from "./components/features/ErrorPage";

export default function Forbidden() {
  return (
    <ErrorPage errorCode={403} />
  );
}
