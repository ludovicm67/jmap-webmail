import React, { useRef, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

export interface SanitizedHtmlProps
  extends React.HTMLAttributes<HTMLDivElement> {
  html: string;
}

const SanitizedHtml: React.FC<SanitizedHtmlProps> = ({ html, ...props }) => {
  const container = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!container.current || shadowRoot) {
      return;
    }

    setShadowRoot(container.current.attachShadow({ mode: 'open' }));
  }, [container, shadowRoot]);

  useEffect(() => {
    if (!shadowRoot) {
      return;
    }
    const dom = DOMPurify.sanitize(html, { RETURN_DOM: true });
    dom
      .querySelectorAll('a')
      .forEach((link: { target: string; rel: string }) => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    shadowRoot.innerHTML = '';
    shadowRoot.appendChild(dom);
  }, [shadowRoot, html]);

  return <div {...props} ref={container}></div>;
};

export default SanitizedHtml;
