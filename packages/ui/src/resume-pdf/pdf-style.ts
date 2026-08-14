import { StyleSheet } from "@react-pdf/renderer";

const probe = StyleSheet.create({ box: {} });

/** Styles produced by StyleSheet.create — assignable to View/Text in documents. */
export type PdfStyle = (typeof probe)["box"];
