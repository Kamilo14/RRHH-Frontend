function ConfiguracionBackButton({ onBack, label = 'Volver a Configuración' }) {
  return (
    <button
      type="button"
      className="settings-back-button"
      onClick={onBack}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
    </button>
  )
}

export default ConfiguracionBackButton
