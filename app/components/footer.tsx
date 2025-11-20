import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Footer() {
    return (
        <footer className="footer footer-horizontal p-4 bg-base-200 text-base-content border-t border-base-content/10">
            <div className="grid grid-flow-col gap-4">
                <a href="https://github.com/aicheye/bucket" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md gap-2">
                    <FontAwesomeIcon icon={faGithub} className="w-4 h-4" />
                    GitHub
                </a>
                <a href="mailto:sean@seanyang.me" className="btn btn-ghost btn-md gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                    Email
                </a>
                <a href="https://seanyang.me" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md gap-2">
                    <FontAwesomeIcon icon={faGlobe} className="w-4 h-4" />
                    Website
                </a>
            </div>
            <div className="self-center justify-self-end text-base-content/70 flex flex-row gap-4">
                <p>Copyright © {new Date().getFullYear()} Sean Yang <a className="link" href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
                    MIT License</a>
                    , Icons from FontAwesome <a className="link" href="https://scripts.sil.org/OFL" target="_blank" rel="noopener noreferrer">
                        SIL OFL 1.1</a>
                </p>
                <p>Read our <a target="_blank" href="/legal/privacy" className="link" rel="noopener noreferrer">
                    Privacy Policy</a> & <a target="_blank" href="/legal/terms" className="link" rel="noopener noreferrer">
                        Terms of Service
                    </a>
                </p>
            </div>
        </footer>
    );
}
