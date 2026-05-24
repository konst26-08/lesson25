import { createPageShell } from "../components/ui/PageShell.js";
import { renderButton } from "../components/ui/Button.js";
import { fetchMe } from "../api/hooks/auth.js";
import { ApiError } from "../api/http.js";
import { navigateTo } from "../utils/navigation.js";
import { METRIKA_GOALS, trackGoal } from "../analytics/metrika.js";

const ERROR_MESSAGES = {
  access_denied: "Вход через Yandex отменён.",
  invalid_request: "Некорректный ответ OAuth. Попробуйте снова.",
  oauth_failed: "Не удалось завершить вход через Yandex.",
  missing_token: "Токен авторизации не получен."
};

function resolveOAuthError(code) {
  return ERROR_MESSAGES[code] ?? `Ошибка OAuth: ${code}`;
}

export function renderOAuthCallbackPage({ store }) {
  const page = createPageShell({
    title: "Вход через Yandex",
    description: "Завершение авторизации…"
  });

  const feedback = document.createElement("p");
  feedback.className = "login-feedback";
  feedback.setAttribute("role", "status");
  page.append(feedback);

  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get("error");
  const token = params.get("token");

  async function finish() {
    if (errorCode) {
      feedback.textContent = resolveOAuthError(errorCode);
      feedback.classList.add("login-feedback-error");
      return;
    }

    if (!token) {
      feedback.textContent = resolveOAuthError("missing_token");
      feedback.classList.add("login-feedback-error");
      return;
    }

    try {
      const profile = await fetchMe(token);
      store.setState((current) => ({
        ...current,
        user: {
          isAuthenticated: true,
          token,
          id: profile.id,
          email: profile.email,
          role: profile.role
        }
      }));
      feedback.textContent = `Вы вошли через Yandex как ${profile.email}.`;
      trackGoal(METRIKA_GOALS.OAUTH_YANDEX_SUCCESS);
      navigateTo("/account/orders");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message || `Ошибка ${error.status}`
          : "Не удалось подтвердить вход.";
      feedback.textContent = message;
      feedback.classList.add("login-feedback-error");
    }
  }

  finish();

  const backBtn = renderButton({
    text: "На страницу входа",
    variant: "secondary",
    onClick: () => navigateTo("/login")
  });
  page.append(backBtn);

  return page;
}
