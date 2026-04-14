/** Fragmento HTML (y estilos) para pie de ticket: política de cambio de tenis. */

export const TICKET_POLITICA_CAMBIO_CSS = `
            .politica { text-align: left; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #000; font-size: 9px; line-height: 1.4; color: #1a1a1a; }
            .politica .escritura { text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 6px; letter-spacing: 0.02em; }
            .politica .titulo-pol { text-align: center; font-weight: bold; font-size: 10px; margin: 0 0 6px 0; text-transform: uppercase; }
            .politica .saludo { margin: 0 0 6px 0; }
            .politica ul { margin: 0; padding-left: 14px; }
            .politica li { margin-bottom: 3px; }
            .politica .codigo-barras { text-align: center; margin: 10px 0 6px 0; padding: 8px 4px; border: 1px dashed #666; font-size: 9px; color: #444; }
            .politica .gracias { text-align: center; margin-top: 8px; font-size: 10px; font-weight: bold; }
`;

export const TICKET_POLITICA_CAMBIO_HTML = `
          <div class="politica">
            <div class="escritura">Escritura</div>
            <div class="titulo-pol">Política de cambio de tenis</div>
            <p class="saludo">Estimado cliente:</p>
            <p style="margin: 0 0 6px 0;">Para realizar cualquier cambio de mercancía, es necesario considerar lo siguiente:</p>
            <ul>
              <li>El cambio aplica únicamente dentro de los 7 días naturales después de la compra.</li>
              <li>Es indispensable presentar ticket de compra.</li>
              <li>El producto debe estar en perfecto estado, sin uso, limpio</li>
              <li>No se realizan devoluciones en efectivo, únicamente cambios por otro producto.</li>
              <li>En caso de diferencia de precio, el cliente deberá cubrir el monto correspondiente.</li>
              <li>Productos en promoción o descuento no tienen cambio</li>
            </ul>
            <div class="codigo-barras">(Código de barras)</div>
            <div class="gracias">Gracias por su preferencia 🙌</div>
          </div>
`;
