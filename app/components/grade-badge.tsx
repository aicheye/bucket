const successCutoff = 80;
const warningCutoff = 60;


export default function GradeBadge({ grade, gpa, disabled = false, size }: { grade?: number, gpa?: number, disabled?: boolean, size?: "sm" | "lg" }) {
    let color = "neutral";
    let textColor = "text-neutral-content";

    if (grade !== undefined) {
        if (grade >= successCutoff) {
            color = "success";
            textColor = "text-success-content";
        }
        else if (grade >= warningCutoff) {
            color = "warning";
            textColor = "text-warning-content";
        }
        else {
            color = "error";
            textColor = "text-error-content";
        }
    }

    if (disabled) {
        textColor = "text-neutral-content/80";
    }

    if (size === "sm") {
        return (
            <div className="flex items-center gap-2">
                <div className={`badge bg-${color}/70 text-sm font-bold ${textColor} border-none`}>
                    {grade !== undefined ? grade.toFixed(1) + "%" : gpa!.toFixed(2)}
                </div>
            </div>
        )
    }

    return (
        <div className={`card card-xl h-full font-black tracking-tighter leading-none bg-${color}/70`}>
            <div className={`flex card-body px-2 p-1 text-2xl text-center ${textColor}`}>
                <div>
                    {gpa !== undefined ? (<span>{gpa.toFixed(2)}</span>) :
                        (<>{grade.toFixed(1)}<span className={"text-md opacity-50 ml-1"}>%</span></>)
                    }
                </div>
            </div>
        </div>
    );
}
