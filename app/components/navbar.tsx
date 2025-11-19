import Profile from "./profile";

export default function Navbar() {
  return (
    <div className="navbar bg-base-100 absolute top-0 left-0 right-0">
      <div className="flex gap-4 min-w-fit"></div>
      <div className="absolute right-3">
        <Profile />
      </div>
    </div>
  );
}
