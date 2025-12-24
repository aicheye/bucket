import type { Metadata } from "next";
import { APP_NAME } from "../../../lib/constants";
import ProsePageContainer from "../../components/features/ProsePageContainer";
import ExternalLink from "../../components/ui/ExternalLink";
import Line from "../../components/ui/Line";

export const metadata: Metadata = {
  title: `License - ${APP_NAME}`,
};

function MITLicense() {
  return (
    <div className="card w-full bg-base-300 shadow-xl flex flex-col gap-4 card-body">
      <h2 className="card-title text-2xl font-bold" id="license">
        The MIT License (MIT)
      </h2>
      <p>Copyright (c) 2025-{new Date().getFullYear()} Sean Yang</p>
      <p>
        Permission is hereby granted, free of charge, to any person obtaining a
        copy of this software and associated documentation files (the
        “Software”), to deal in the Software without restriction, including
        without limitation the rights to use, copy, modify, merge, publish,
        distribute, sublicense, and/or sell copies of the Software, and to
        permit persons to whom the Software is furnished to do so, subject to
        the following conditions:
      </p>
      <p>
        The above copyright notice and this permission notice shall be included
        in all copies or substantial portions of the Software.
      </p>
      <p>
        THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
        OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
        IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
        CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
        TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
        SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      </p>
    </div>
  );
}

export default function LicensesPage() {
  return (
    <ProsePageContainer>
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Preamble</h2>
        <p>
          This application makes use of the following third-party libraries and
          services:
        </p>
        <h3 className="text-xl font-bold">Runtime Dependencies</h3>
        <ul className="ml-4 list-disc list-inside">
          <li>
            <strong>Next.js:</strong> App framework. License: MIT.{" "}
            <ExternalLink href="https://github.com/vercel/next.js/blob/canary/license.md">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>React / React DOM:</strong> UI library. License: MIT.{" "}
            <ExternalLink href="https://github.com/facebook/react/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>graphql:</strong> GraphQL reference implementation. License:
            MIT.{" "}
            <ExternalLink href="https://github.com/graphql/graphql-js/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>next-auth:</strong> Authentication for Next.js. License:
            MIT.{" "}
            <ExternalLink href="https://github.com/nextauthjs/next-auth/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>recharts:</strong> Charting library. License: MIT.{" "}
            <ExternalLink href="https://github.com/recharts/recharts/blob/2.x/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>jsonwebtoken:</strong> JWT utilities. License: MIT.{" "}
            <ExternalLink href="https://github.com/auth0/node-jsonwebtoken/blob/master/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>jsdom:</strong> HTML parsing. License: MIT.{" "}
            <ExternalLink href="https://github.com/jsdom/jsdom/blob/main/LICENSE.txt">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>pdf2json:</strong> PDF text extraction (v3.1.3). License:
            Apache 2.0.{" "}
            <ExternalLink href="https://github.com/modesty/pdf2json/blob/master/license.txt">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>Font Awesome Free Icons:</strong> UI Icons. License: CC BY
            4.0.{" "}
            <ExternalLink href="https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>react-snowfall:</strong> Snowfall effect. License: MIT.{" "}
            <ExternalLink href="https://github.com/cahilfoley/react-snowfall/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
        </ul>
        <h3 className="text-xl font-bold mt-4">Build / Dev Tooling</h3>
        <ul className="ml-4 list-disc list-inside">
          <li>
            <strong>TypeScript:</strong> Language tooling.{" "}
            <ExternalLink href="https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>Tailwind CSS:</strong> Utility-first CSS framework. License:
            MIT.{" "}
            <ExternalLink href="https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>daisyUI:</strong> Tailwind component library. License: MIT.{" "}
            <ExternalLink href="https://github.com/saadeghi/daisyui/blob/master/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>ESLint:</strong> Linting utility. License: MIT.{" "}
            <ExternalLink href="https://github.com/eslint/eslint/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>Prettier:</strong> Formatting utility. License: MIT.{" "}
            <ExternalLink href="https://github.com/prettier/prettier/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
        </ul>
        <h3 className="text-xl font-bold mt-4">
          Backend Libraries and Frameworks
        </h3>
        <ul className="ml-4 list-disc list-inside">
          <li>
            <strong>Docker Compose:</strong> Licensed under the Apache License
            2.0.{" "}
            <ExternalLink href="https://github.com/docker/compose/blob/main/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>Hasura GraphQL Engine:</strong> Licensed under the Apache
            License 2.0.{" "}
            <ExternalLink href="https://github.com/hasura/graphql-engine/blob/stable/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>PostgreSQL:</strong> Licensed under the PostgreSQL License.{" "}
            <ExternalLink href="https://www.postgresql.org/about/licence/">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>nginx:</strong> Licensed under the 2-clause BSD-like
            license.{" "}
            <ExternalLink href="https://nginx.org/LICENSE">
              Full license text
            </ExternalLink>
            .
          </li>
          <li>
            <strong>Certbot:</strong> Licensed under the Apache License 2.0.{" "}
            <ExternalLink href="https://github.com/certbot/certbot/blob/master/LICENSE.txt">
              Full license text
            </ExternalLink>
            .
          </li>
        </ul>
        <h3 className="text-xl font-bold mt-4">Large Language Models (LLMs)</h3>
        <p>
          This application was developed with the assistance of the following
          third-party large language models (LLMs) using GitHub Copilot. These
          models provided suggestions and code snippets during the development
          process. Under their respective terms of service, all model output is
          provided &quot;as is&quot; without warranties of any kind, and
          intellectual property rights are not claimed by their developers.
        </p>
        <p>
          In the interest of transparency, the LLMs used include (roughly in
          order of usage):
        </p>
        <ul className="ml-4 list-disc list-inside">
          <li>Google Gemini 3 Pro</li>
          <li>OpenAI GPT-5 mini</li>
          <li>Google Gemini 2.5 Pro</li>
          <li>Anthropic Claude 4.5 Opus</li>
          <li>Google Gemini 3 Flash</li>
          <li>Anthropic Claude 4.5 Haiku</li>
          <li>GitHub Copilot Raptor Mini</li>
        </ul>
      </div>
      <Line direction="hor" className="w-full" />
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Application License</h1>
        <p>
          As a thanks to the open-source community and the creators of the
          third-party libraries used in this application, this application is
          fully open-source and solely licensed under the{" "}
          <ExternalLink href="https://opensource.org/licenses/MIT">
            MIT License
          </ExternalLink>
          , also known as the Expat License.
        </p>
        <p>
          This permissive license allows anyone to freely use, copy, modify,
          merge, publish, distribute, sublicense, and/or sell copies of the
          software, subject to the inclusion of the original copyright and
          license notice in all copies or substantial portions of the software.
        </p>
        <p>
          Open source software is made possible by the contributions of many
          developers. By releasing this application under the MIT License, I
          hope to give back to the community and advance the spirit of open
          collaboration.
        </p>
        <p>
          The following is the full text of the MIT License. You may also find
          it in the LICENSE file in the root directory of this source code
          repository{" "}
          <ExternalLink href="https://github.com/aicheye/bucket/blob/main/LICENSE">
            here
          </ExternalLink>
          .
        </p>
      </div>
      <Line direction="hor" className="w-full" />
      <MITLicense />
    </ProsePageContainer>
  );
}
