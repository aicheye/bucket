"use client";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signIn, useSession } from "next-auth/react";
import Navbar from "./components/navbar";

function buttonClick() {
  document.getElementById("outlineInput")?.click();
}

async function fileChange(id: string) {
  const input = document.getElementById("outlineInput") as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const text = await file.text();

  const res = await fetch("/api/parse_outline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html_text: text }),
  });

  const data = await res.json();

  await addCourse(data.code, data.term, data.data, id);
}

async function addCourse(code: string, term: string, data: object, owner_id: string) {
  const mutation = `mutation InsertCourses($data: jsonb, $code: String, $owner_id: String, $term: String) {
    insert_courses(objects: {data: $data, code: $code, owner_id: $owner_id, term: $term}) {
      affected_rows
      returning {
        data
        code
        owner_id
        term
        id
      }
    }
  }`;

  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `${mutation}`,
      variables: {
        code: code,
        term: term,
        data: data,
        owner_id: owner_id,
      },
    }),
  });

  console.log("Add course response:", await res.json());
}

export default function Home() {
  const { data: session } = useSession();

  return (
    <>
      {session ? (
        <>
          <Navbar />
          <div className="text-center flex flex-col gap-4">
            <h1 className="mb-4 text-2xl font-bold">Welcome, {session.user?.name}!</h1>
            <input onChange={() => fileChange(session.user.id)} type="file" id="outlineInput" accept=".html" style={{ display: "none" }} />
            <button onClick={() => buttonClick()} className="btn btn-primary">
              Add Course
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="flex min-h-screen items-center justify-center">
            <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn btn-primary">
              Sign in with <FontAwesomeIcon icon={faGoogle} className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
