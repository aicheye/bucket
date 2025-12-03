import ErrorPage from "./components/features/ErrorPage";

export default function Unauthorized() {
  return (
    <ErrorPage errorCode={401} />
  );
}
