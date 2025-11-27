import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bucket | License",
};

export default function LicensesPage() {
  return (
    <div className="flex flex-col flex-1 gap-8 max-w-3xl mx-auto py-12 px-4 w-full text-base-content text-left">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold" id="license">
          Preamble
        </h2>
        <p>
          This application makes use of the following third-party libraries:
        </p>
        <ul className="ml-4 list-disc list-inside">
          <li>
            <strong>Next.js:</strong> Licensed under the MIT License. For more
            information, please visit{" "}
            <a
              href="https://github.com/vercel/next.js/blob/canary/license.md"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              https://github.com/vercel/next.js/blob/canary/license.md
            </a>
            .
          </li>
          <li>
            <strong>React:</strong> Licensed under the MIT License. For more
            information, please visit{" "}
            <a
              href="https://github.com/facebook/react/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              https://github.com/facebook/react/blob/main/LICENSE
            </a>
            .
          </li>
          <li>
            <strong>Tailwind CSS:</strong> Licensed under the MIT License. For more
            information, please visit{" "}
            <a
              href="https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE
            </a>
            .
          </li>
          <li>
            <strong>DaisyUI:</strong> Licensed under the MIT License. For more
            information, please visit{" "}
            <a
              href="https://github.com/saadeghi/daisyui/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              https://github.com/saadeghi/daisyui/blob/master/LICENSE
            </a>
            .
          </li>
          <li>
            <strong>Font Awesome Free Icons:</strong> Licensed under CC BY 4.0. For more
            information, please visit{" "}
            <a
              href="https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
            </a>
          </li>
        </ul>
        <p>
          The following is the full text of the MIT License under which this
          application is licensed:
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold" id="license">
          The MIT License (MIT)
        </h1>
        <p>
          Copyright (c) {new Date().getFullYear()} Sean Yang
        </p>
        <p>
          Permission is hereby granted, free of charge, to any person obtaining a copy of
          this software and associated documentation files (the “Software”), to deal in
          the Software without restriction, including without limitation the rights to
          use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
          the Software, and to permit persons to whom the Software is furnished to do so,
          subject to the following conditions:
        </p>
        <p>
          The above copyright notice and this permission notice shall be included in all
          copies or substantial portions of the Software.
        </p>
        <p>
          THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
          COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
          IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
          CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        </p>
      </div>
    </div>
  );
}
