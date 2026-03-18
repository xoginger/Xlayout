"use client";

import * as THREE from 'three';
// @ts-ignore
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
// @ts-ignore
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { SceneItem } from '../store/editor-store';

export const exportEngine = {
  async exportImage(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, name: string) {
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${name.replace(/\s+/g, '_')}_snapshot.png`;
    link.href = dataUrl;
    link.click();
  },

  async exportGLB(scene: THREE.Scene, name: string) {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result: any) => {
        const output = result instanceof ArrayBuffer ? result : JSON.stringify(result);
        const blob = new Blob([output], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.download = `${name.replace(/\s+/g, '_')}.glb`;
        link.href = URL.createObjectURL(blob);
        link.click();
      },
      (error: any) => {
        console.error('An error happened during GLTF export', error);
      },
      { binary: true }
    );
  },

  async exportPDF(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, project: { name: string, id: string }, items: SceneItem[]) {
    gl.render(scene, camera);
    const snapshot = gl.domElement.toDataURL('image/jpeg', 0.8);

    const doc = new jsPDF() as any;
    const now = new Date().toLocaleString();

    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('XLAYOUT DESIGN QUOTE', 20, 25);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`PROJECT ID: ${project.id.toUpperCase()}`, 140, 20);
    doc.text(`GENERATED: ${now.toUpperCase()}`, 140, 25);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text(project.name.toUpperCase(), 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 58, 190, 58);

    doc.addImage(snapshot, 'JPEG', 20, 65, 170, 95);

    const tableData = items.reduce((acc: any[], item) => {
      const existing = acc.find(p => p.productId === item.productId);
      if (existing) {
        existing.quantity += 1;
        existing.total += (item.price || 0);
      } else {
        acc.push({
          productId: item.productId,
          name: item.label || 'Unnamed Component',
          quantity: 1,
          price: item.price || 0,
          total: item.price || 0
        });
      }
      return acc;
    }, []);

    const totalQuote = tableData.reduce((sum, p) => sum + p.total, 0);

    doc.autoTable({
      startY: 170,
      head: [['PRODUCT ID', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
      body: tableData.map(p => [
        p.productId.toUpperCase(),
        p.name.toUpperCase(),
        p.quantity,
        `€${p.price.toFixed(2)}`,
        `€${p.total.toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 30], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ESTIMATED QUOTE: €${totalQuote.toFixed(2)}`, 190, finalY, { align: 'right' });

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('This document is a generated layout estimate and does not constitute a final commercial binding offer.', 20, 285);

    doc.save(`${project.name.replace(/\s+/g, '_')}_Quote.pdf`);
  }
};
