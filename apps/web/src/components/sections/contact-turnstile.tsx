"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export type ContactTurnstileHandle = {
  getToken: () => Promise<string>;
  reset: () => void;
};

type ContactTurnstileProps = {
  siteKey: string;
};

export const ContactTurnstile = forwardRef<ContactTurnstileHandle, ContactTurnstileProps>(
  function ContactTurnstile({ siteKey }, ref) {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const [token, setToken] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      async getToken() {
        if (token) return token;
        const pending = await turnstileRef.current?.getResponsePromise();
        if (!pending) {
          throw new Error("Turnstile verification is not ready");
        }
        return pending;
      },
      reset() {
        setToken(null);
        turnstileRef.current?.reset();
      },
    }));

    return (
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={setToken}
        onExpire={() => {
          setToken(null);
          turnstileRef.current?.reset();
        }}
        options={{
          size: "invisible",
          execution: "render",
          appearance: "execute",
          refreshExpired: "auto",
        }}
      />
    );
  },
);
