export function useDateTimeFormatter() {
  const { locale } = useI18n();
  const mounted = ref(false);

  onMounted(() => {
    mounted.value = true;
  });

  function formatDateTime(value: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale.value, {
      ...options,
      ...(mounted.value ? {} : { timeZone: "UTC" }),
    }).format(new Date(value));
  }

  return { formatDateTime };
}
