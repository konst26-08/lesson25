import { createPageShell } from "../components/ui/PageShell";
import { renderStepper } from "../components/ui/Stepper";
import { renderButton } from "../components/ui/Button";
import { renderInputField } from "../components/ui/InputField";
import { navigateTo } from "../utils/navigation";
import { validateEmail, validatePhone, validateRequired } from "../utils/validation";
import { createOrder } from "../api/hooks/orders.js";
import { ApiError } from "../api/http.js";
import { trackPurchase } from "../analytics/metrika.js";

const totalSteps = 3;
const checkoutFieldConfigs = {
  1: [
    { id: "name", label: "Имя", placeholder: "Введите имя", required: true },
    { id: "phone", label: "Телефон", placeholder: "+79990000000", required: true },
    { id: "email", label: "Email", type: "email", placeholder: "you@email.ru", required: true }
  ],
  2: [
    { id: "city", label: "Город", placeholder: "Москва", required: true },
    { id: "street", label: "Улица", placeholder: "Ленина", required: true },
    { id: "house", label: "Дом", placeholder: "10", required: true },
    { id: "apartment", label: "Квартира", placeholder: "25" },
    { id: "zip", label: "Индекс", placeholder: "101000" }
  ]
};

function validateStep(step, fields) {
  if (step === 1) {
    return (
      validateRequired(fields.name) && validatePhone(fields.phone) && validateEmail(fields.email)
    );
  }

  if (step === 2) {
    return (
      validateRequired(fields.city) &&
      validateRequired(fields.street) &&
      validateRequired(fields.house)
    );
  }

  return true;
}

function getFirstInvalidFieldKey(step, fields) {
  if (step === 1) {
    if (!validateRequired(fields.name)) {
      return "name";
    }

    if (!validatePhone(fields.phone)) {
      return "phone";
    }

    if (!validateEmail(fields.email)) {
      return "email";
    }
  }

  if (step === 2) {
    if (!validateRequired(fields.city)) {
      return "city";
    }

    if (!validateRequired(fields.street)) {
      return "street";
    }

    if (!validateRequired(fields.house)) {
      return "house";
    }
  }

  return "";
}

function buildOrderPayload(cart, fields) {
  return {
    items: cart.map((item) => ({
      productId: Number.parseInt(item.id, 10),
      productName: `${item.name} (${item.size})`,
      quantity: Number.parseInt(item.quantity, 10) || 1,
      unitPrice: Number(item.price)
    })),
    contacts: {
      name: fields.name,
      phone: fields.phone,
      email: fields.email
    },
    address: {
      city: fields.city,
      street: fields.street,
      house: fields.house,
      apartment: fields.apartment,
      zip: fields.zip
    }
  };
}

export function renderCheckoutPage({ store }) {
  if (!store.getState().cart.length) {
    navigateTo("/cart");
    return createPageShell({
      title: "Перенаправление в корзину",
      description: "Оформление доступно только с товарами в корзине."
    });
  }

  let currentStep = 1;
  let isSubmitting = false;
  const fields = {
    name: "",
    phone: "",
    email: "",
    city: "",
    street: "",
    house: "",
    apartment: "",
    zip: ""
  };

  const page = createPageShell({
    title: "Оформление заказа",
    description: "Пошаговый checkout с контактами, адресом и подтверждением."
  });

  const stepper = renderStepper({ currentStep, totalSteps });
  const form = document.createElement("form");
  form.className = "checkout-form";
  form.addEventListener("submit", (event) => event.preventDefault());
  const controls = document.createElement("div");
  controls.className = "checkout-controls";
  const error = document.createElement("p");
  error.className = "validation-message";

  function bindField(field) {
    field.input.addEventListener("input", (event) => {
      fields[event.target.name] = event.target.value;
    });
    form.append(field.wrapper);
  }

  function renderStepInputs(step) {
    const config = checkoutFieldConfigs[step] ?? [];
    config.forEach((fieldConfig) => {
      const field = renderInputField({
        ...fieldConfig,
        value: fields[fieldConfig.id]
      });
      bindField(field);
    });
  }

  function renderStepFields() {
    form.replaceChildren();

    if (currentStep === 1 || currentStep === 2) {
      renderStepInputs(currentStep);
    }

    if (currentStep === 3) {
      const confirmation = document.createElement("p");
      confirmation.className = "checkout-confirmation";
      confirmation.textContent = "Проверьте контакты и адрес доставки перед оплатой.";

      const { user } = store.getState();
      const authHint = document.createElement("p");
      authHint.className = "checkout-auth-hint";
      if (!user.isAuthenticated || !user.token) {
        authHint.textContent = "Для сохранения заказа войдите в аккаунт на странице «Вход».";
      } else {
        authHint.textContent = `Оформление для: ${user.email}`;
      }

      form.append(confirmation, authHint);
    }
  }

  async function submitOrder() {
    if (isSubmitting) {
      return;
    }

    const { user, cart } = store.getState();
    if (!user.isAuthenticated || !user.token) {
      error.textContent = "Войдите в аккаунт, чтобы оформить заказ.";
      return;
    }

    if (!validateStep(1, fields) || !validateStep(2, fields)) {
      error.textContent = "Проверьте контакты и адрес доставки.";
      return;
    }

    isSubmitting = true;
    error.textContent = "Создание заказа…";

    try {
      const order = await createOrder(user.token, buildOrderPayload(cart, fields));
      trackPurchase(order, cart);
      store.setState((current) => ({
        ...current,
        cart: [],
        lastOrder: {
          orderNumber: order.orderNumber,
          total: order.total,
          createdAt: order.createdAt
        }
      }));
      navigateTo("/order-success");
    } catch (submitError) {
      isSubmitting = false;
      if (submitError instanceof ApiError) {
        const details = Array.isArray(submitError.body?.details)
          ? submitError.body.details.join(" ")
          : "";
        error.textContent = details || submitError.message || `Ошибка ${submitError.status}`;
      } else {
        error.textContent = "Не удалось создать заказ. Проверьте, что API запущен.";
      }
      syncControls();
    }
  }

  function syncControls() {
    controls.replaceChildren();
    stepper.querySelector(".stepper-label").textContent = `${currentStep}/${totalSteps}`;
    stepper.querySelector(".stepper-progress-value").style.width =
      `${(currentStep / totalSteps) * 100}%`;

    if (currentStep > 1) {
      controls.append(
        renderButton({
          text: "Назад",
          variant: "secondary",
          disabled: isSubmitting,
          onClick: () => {
            currentStep -= 1;
            error.textContent = "";
            renderStepFields();
            syncControls();
          }
        })
      );
    }

    if (currentStep < totalSteps) {
      controls.append(
        renderButton({
          text: "Далее",
          disabled: isSubmitting,
          onClick: () => {
            if (!validateStep(currentStep, fields)) {
              error.textContent = "Проверьте заполнение обязательных полей.";
              const invalidKey = getFirstInvalidFieldKey(currentStep, fields);
              const invalidInput = form.querySelector(`#${invalidKey}`);
              if (invalidInput instanceof HTMLElement) {
                invalidInput.focus();
              }
              return;
            }

            error.textContent = "";
            currentStep += 1;
            renderStepFields();
            syncControls();
          }
        })
      );
    } else {
      controls.append(
        renderButton({
          text: isSubmitting ? "Оформление…" : "Перейти к оплате",
          disabled: isSubmitting,
          onClick: () => submitOrder()
        })
      );
    }
  }

  renderStepFields();
  syncControls();
  page.append(stepper, form, error, controls);

  return page;
}
