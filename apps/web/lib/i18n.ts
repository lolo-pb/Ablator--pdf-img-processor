import { cookies } from "next/headers";

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const localeCookieName = "ui-locale";

const dictionaries = {
  en: {
    brand: {
      name: "BMS",
      subtitle: "Bank Management Studio",
    },
    nav: {
      businesses: "Businesses",
      templates: "Templates",
      review: "Review",
      createTemplate: "Create template",
      backToTemplates: "Back to templates",
      backToBusiness: "Back to business",
      backToUpload: "Back to upload",
      switchLanguage: "Language",
      localWarning: "Using local data",
    },
    home: {
      title: "Choose a business workspace",
      subtitle: "Open a business to manage templates and process bank summaries into reviewable Excel-ready data.",
      openWorkspace: "Open workspace",
      templateCount: "templates",
      jobCount: "jobs",
    },
    business: {
      title: "Templates",
      subtitle: "Choose a template to upload bank files and run extraction.",
      emptyTitle: "No templates yet",
      emptyBody: "Create your first template to start processing bank summaries and reconciliations.",
      latestVersion: "Latest version",
      categories: "Categories",
      openTemplate: "Open template",
      updatedAt: "Updated",
      family: "Family",
    },
    templateForm: {
      title: "Create template",
      subtitle: "Define how this business should read, classify, and export transactions.",
      name: "Template name",
      documentFamily: "Document family",
      instructions: "Instructions",
      categories: "Categories",
      ignoreRules: "Ignore rules",
      exampleNotes: "Example notes",
      submit: "Save template",
    },
    templateDetail: {
      uploadTitle: "Upload files",
      uploadBody: "Drop a PDF or image here, or browse files, then process them with this template.",
      dropPrompt: "Drop PDF or image files here",
      browseFiles: "Choose files",
      fileTypesHint: "Supports PDF, PNG, JPG, and other common image formats.",
      selectedFiles: "Selected files",
      removeFile: "Remove",
      currentFiles: "Current files",
      noFiles: "No files uploaded yet.",
      process: "Process",
      replaceHint: "Uploading new files replaces the current draft files before processing.",
      templateInfo: "Template details",
      draftReady: "Draft job ready",
      latestReview: "Latest review draft available",
    },
    review: {
      title: "Review extracted rows",
      subtitle: "Check dates, descriptions, categories, and amounts before exporting to Excel.",
      markReady: "Mark ready",
      export: "Export xlsx",
      reviewComplete: "Review ready for export",
      noRows: "No extracted rows yet. Process files first.",
      confidence: "Confidence",
      status: "Status",
      notes: "Notes",
      date: "Date",
      description: "Description",
      amount: "Amount",
      direction: "Direction",
      category: "Category",
      jobSummary: "Job summary",
      warnings: "Warnings",
      none: "none",
      uploadedFiles: "Uploaded files",
      reviewSaved: "Review changes saved.",
      reviewFailed: "Review update failed.",
    },
    actions: {
      cancel: "Cancel",
      role: "Role",
    },
  },
  es: {
    brand: {
      name: "BMS",
      subtitle: "Estudio de Gestion Bancaria",
    },
    nav: {
      businesses: "Negocios",
      templates: "Plantillas",
      review: "Revision",
      createTemplate: "Crear plantilla",
      backToTemplates: "Volver a plantillas",
      backToBusiness: "Volver al negocio",
      backToUpload: "Volver a carga",
      switchLanguage: "Idioma",
      localWarning: "Usando datos locales",
    },
    home: {
      title: "Elegi un espacio de negocio",
      subtitle: "Abri un negocio para administrar plantillas y procesar resumentes bancarios en datos listos para Excel.",
      openWorkspace: "Abrir espacio",
      templateCount: "plantillas",
      jobCount: "trabajos",
    },
    business: {
      title: "Plantillas",
      subtitle: "Elegi una plantilla para cargar archivos bancarios y ejecutar la extraccion.",
      emptyTitle: "No templates yet",
      emptyBody: "Crea tu primera plantilla para empezar a procesar resumentes bancarios y conciliaciones.",
      latestVersion: "Ultima version",
      categories: "Categorias",
      openTemplate: "Abrir plantilla",
      updatedAt: "Actualizada",
      family: "Familia",
    },
    templateForm: {
      title: "Crear plantilla",
      subtitle: "Defini como este negocio debe leer, clasificar y exportar transacciones.",
      name: "Nombre de la plantilla",
      documentFamily: "Familia del documento",
      instructions: "Instrucciones",
      categories: "Categorias",
      ignoreRules: "Reglas para ignorar",
      exampleNotes: "Notas de ejemplo",
      submit: "Guardar plantilla",
    },
    templateDetail: {
      uploadTitle: "Cargar archivos",
      uploadBody: "Solta un PDF o imagen aca, o busca archivos, y despues procesalos con esta plantilla.",
      dropPrompt: "Solta archivos PDF o imagenes aca",
      browseFiles: "Elegir archivos",
      fileTypesHint: "Soporta PDF, PNG, JPG y otros formatos de imagen comunes.",
      selectedFiles: "Archivos seleccionados",
      removeFile: "Quitar",
      currentFiles: "Archivos actuales",
      noFiles: "Todavia no hay archivos cargados.",
      process: "Procesar",
      replaceHint: "Cargar archivos nuevos reemplaza los archivos actuales del borrador antes de procesar.",
      templateInfo: "Detalles de la plantilla",
      draftReady: "Borrador listo",
      latestReview: "Hay un borrador de revision disponible",
    },
    review: {
      title: "Revisar filas extraidas",
      subtitle: "Revisa fechas, descripciones, categorias y montos antes de exportar a Excel.",
      markReady: "Marcar listo",
      export: "Exportar xlsx",
      reviewComplete: "Revision lista para exportar",
      noRows: "Todavia no hay filas extraidas. Primero procesa archivos.",
      confidence: "Confianza",
      status: "Estado",
      notes: "Notas",
      date: "Fecha",
      description: "Descripcion",
      amount: "Monto",
      direction: "Direccion",
      category: "Categoria",
      jobSummary: "Resumen del trabajo",
      warnings: "Alertas",
      none: "ninguna",
      uploadedFiles: "Archivos cargados",
      reviewSaved: "Cambios de revision guardados.",
      reviewFailed: "La revision no se pudo guardar.",
    },
    actions: {
      cancel: "Cancelar",
      role: "Rol",
    },
  },
} as const;

export type Messages = (typeof dictionaries)["en"];

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const current = store.get(localeCookieName)?.value;
  if (current && locales.includes(current as Locale)) {
    return current as Locale;
  }
  return "en";
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  const resolved = locale ?? (await getLocale());
  return dictionaries[resolved] as Messages;
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
