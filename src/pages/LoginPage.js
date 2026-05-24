import { createPageShell } from "../components/ui/PageShell";
import { renderButton } from "../components/ui/Button";
import { renderInputField } from "../components/ui/InputField";
import { loginUser, registerUser } from "../api/hooks/auth.js";
import { getOAuthStartUrl } from "../api/config.js";
import { ApiError } from "../api/http.js";
import { METRIKA_GOALS, trackGoal } from "../analytics/metrika.js";

function renderMessage(paragraph, text, variant = "info") {
  paragraph.textContent = text;
  paragraph.className =
    variant === "error" ? "login-feedback login-feedback-error" : "login-feedback";
}

export function renderLoginPage({ store }) {
  const page = createPageShell({
    title: "Вход и регистрация",
    description: "Данные отправляются на Backend API (JWT)."
  });

  const form = document.createElement("div");
  form.className = "checkout-form";

  const emailField = renderInputField({
    id: "login-email",
    label: "Email",
    placeholder: "you@example.com",
    type: "email",
    required: true
  });

  const passwordField = renderInputField({
    id: "login-password",
    label: "Пароль",
    placeholder: "Не менее 8 символов",
    type: "password",
    required: true
  });

  const feedback = document.createElement("p");
  feedback.setAttribute("role", "status");
  feedback.className = "login-feedback";

  const buttonsRow = document.createElement("div");
  buttonsRow.className = "checkout-controls";

  const loginBtn = renderButton({
    text: "Войти",
    onClick: async () => {
      renderMessage(feedback, "Отправка…");
      try {
        const data = await loginUser({
          email: emailField.input.value,
          password: passwordField.input.value
        });
        store.setState((current) => ({
          ...current,
          user: {
            isAuthenticated: true,
            token: data.token,
            id: data.user.id,
            email: data.user.email,
            role: data.user.role
          }
        }));
        renderMessage(feedback, `Вы вошли как ${data.user.email} (${data.user.role}).`);
        trackGoal(METRIKA_GOALS.LOGIN_SUCCESS);
      } catch (error) {
        const msg =
          error instanceof ApiError
            ? error.message || `Ошибка ${error.status}`
            : "Сеть или сервер недоступны.";
        renderMessage(feedback, msg, "error");
      }
    }
  });

  const registerBtn = renderButton({
    text: "Зарегистрироваться",
    variant: "secondary",
    onClick: async () => {
      renderMessage(feedback, "Отправка…");
      try {
        const data = await registerUser({
          email: emailField.input.value,
          password: passwordField.input.value
        });
        store.setState((current) => ({
          ...current,
          user: {
            isAuthenticated: true,
            token: data.token,
            id: data.user.id,
            email: data.user.email,
            role: data.user.role
          }
        }));
        renderMessage(feedback, `Аккаунт создан. Вы вошли как ${data.user.email}.`);
        trackGoal(METRIKA_GOALS.REGISTER_SUCCESS);
      } catch (error) {
        const msg =
          error instanceof ApiError
            ? error.message || `Ошибка ${error.status}`
            : "Сеть или сервер недоступны.";
        renderMessage(feedback, msg, "error");
      }
    }
  });

  buttonsRow.append(loginBtn, registerBtn);

  const oauthRow = document.createElement("div");
  oauthRow.className = "checkout-controls";

  const yandexBtn = renderButton({
    text: "Войти через Yandex",
    variant: "secondary",
    onClick: () => {
      window.location.href = getOAuthStartUrl("yandex");
    }
  });

  oauthRow.append(yandexBtn);
  form.append(emailField.wrapper, passwordField.wrapper, feedback, buttonsRow, oauthRow);
  page.append(form);

  return page;
}
