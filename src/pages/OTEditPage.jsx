import useOTEditState from '../components/ot-edit/useOTEditState.js'
import useKeyboardShortcuts from '../components/ot-edit/useKeyboardShortcuts.js'
import OTStepHeader from '../components/ot-edit/OTStepHeader.jsx'
import PatientCard from '../components/ot-edit/PatientCard.jsx'
import OrderCard from '../components/ot-edit/OrderCard.jsx'
import ExamCard from '../components/ot-edit/ExamCard.jsx'
import ExamSidebar from '../components/ot-edit/ExamSidebar.jsx'

export default function OTEditPage() {
  const state = useOTEditState()

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    handleSave: state.handleSave,
    navigate: state.navigate,
    anyDropdownOpen: state.anyDropdownOpen,
    pacInputRef: state.pacInputRef,
    procInputRef: state.procInputRef,
    examSearchInputRef: state.examSearchInputRef,
  })

  if (state.loading) return (
    <div className="ote-loading">
      <div className="ote-spinner" />
      <span>Cargando...</span>
    </div>
  )

  return (
    <div className="ote-shell">
      {/* Header with step indicator */}
      <OTStepHeader
        stepStatus={state.stepStatus}
        isEdit={state.isEdit}
        numero={state.numero}
        saving={state.saving}
        handleSave={state.handleSave}
        navigate={state.navigate}
        pacInputRef={state.pacInputRef}
        procInputRef={state.procInputRef}
        examSearchInputRef={state.examSearchInputRef}
      />

      {/* Error alert */}
      {state.error && (
        <div className="ote-error">
          <span>{state.error}</span>
          <button onClick={() => state.setError(null)}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Left column: Patient + Order */}
      <div className="ote-left-col">
        <PatientCard
          paciente={state.paciente}
          setPaciente={state.setPaciente}
          isEdit={state.isEdit}
          pacSearchQuery={state.pacSearchQuery}
          pacSearchResults={state.pacSearchResults}
          pacSearchOpen={state.pacSearchOpen}
          handlePacSearchChange={state.handlePacSearchChange}
          selectPaciente={state.selectPaciente}
          resetPaciente={state.resetPaciente}
          pacKb={state.pacKb}
          pacSearchRef={state.pacSearchRef}
          pacInputRef={state.pacInputRef}
          stepStatus={state.stepStatus.paciente}
        />

        <OrderCard
          orden={state.orden}
          setOrden={state.setOrden}
          paciente={state.paciente}
          catalogs={state.catalogs}
          servicioInfo={state.servicioInfo}
          procSearchQuery={state.procSearchQuery}
          procFiltered={state.procFiltered}
          procSearchOpen={state.procSearchOpen}
          handleProcSearchChange={state.handleProcSearchChange}
          selectProcedencia={state.selectProcedencia}
          clearProcedencia={state.clearProcedencia}
          medSearchQuery={state.medSearchQuery}
          medSearchResults={state.medSearchResults}
          medSearchOpen={state.medSearchOpen}
          handleMedSearchChange={state.handleMedSearchChange}
          selectMedico={state.selectMedico}
          handleCreateMedico={state.handleCreateMedico}
          showNewMedico={state.showNewMedico}
          setShowNewMedico={state.setShowNewMedico}
          newMedico={state.newMedico}
          setNewMedico={state.setNewMedico}
          procKb={state.procKb}
          medKb={state.medKb}
          procSearchRef={state.procSearchRef}
          medSearchRef={state.medSearchRef}
          procInputRef={state.procInputRef}
          medInputRef={state.medInputRef}
          stepStatus={state.stepStatus.orden}
        />
      </div>

      {/* Center column: Exams */}
      <ExamCard
        servicioInfo={state.servicioInfo}
        searchQuery={state.searchQuery}
        searchResults={state.searchResults}
        searchOpen={state.searchOpen}
        searchLoading={state.searchLoading}
        handleSearchChange={state.handleSearchChange}
        addPrueba={state.addPrueba}
        addGrupo={state.addGrupo}
        selectedPruebas={state.selectedPruebas}
        selectedGrupos={state.selectedGrupos}
        removePrueba={state.removePrueba}
        removeGrupo={state.removeGrupo}
        grupoCantidades={state.grupoCantidades}
        updateGrupoCantidad={state.updateGrupoCantidad}
        searchKb={state.searchKb}
        searchRef={state.searchRef}
        examSearchInputRef={state.examSearchInputRef}
        getSearchItemFlatIdx={state.getSearchItemFlatIdx}
        stepStatus={state.stepStatus.examenes}
      />

      {/* Right sidebar: Muestras + Total + Actions */}
      <ExamSidebar
        muestrasPreview={state.muestrasPreview}
        totalPrice={state.totalPrice}
        calcTotales={state.calcTotales}
        servicioInfo={state.servicioInfo}
        descuento={state.descuento}
        updateDescuento={state.updateDescuento}
        saving={state.saving}
        isEdit={state.isEdit}
        handleSave={state.handleSave}
        navigate={state.navigate}
      />
    </div>
  )
}
