import ErrorPage from "./components/features/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage errorCode={404} />
  );
}
