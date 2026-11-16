import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  authConfigured,
  login,
  loginSchema,
  type LoginValues,
} from "./auth-api";
import { useLoginPreference } from "./auth-store";
export function useLogin() {
  const preference = useLoginPreference();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: preference.rememberMe,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const navigate = useNavigate(),
    client = useQueryClient(),
    lock = useRef(false);
  const mutation = useMutation({
    mutationFn: login,
    retry: false,
    onSuccess: (user) => {
      client.setQueryData(["session"], user);
      navigate(authConfigured ? "/workbench" : "/preview/leader/L02", {
        replace: true,
      });
    },
  });
  const submit = form.handleSubmit(async (values) => {
    if (lock.current) return;
    lock.current = true;
    preference.setRememberMe(values.rememberMe);
    try {
      await mutation.mutateAsync(values);
    } catch {
      /* mutation.error supplies the accessible error banner */
    } finally {
      lock.current = false;
    }
  });
  return { form, mutation, submit };
}
