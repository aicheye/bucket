import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signIn } from "next-auth/react";

export default function AuthComponent() {
    return (
        <button onClick={() => signIn("google", { callbackUrl: "/courses" })} className="btn btn-primary">
            Sign in with <FontAwesomeIcon icon={faGoogle} className="w-3 h-3" />
        </button>
    );
}
