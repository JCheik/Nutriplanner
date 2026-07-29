import type { Metadata } from 'next';

import { CONTACT_EMAIL, LEGAL_UPDATED, RESPONSIBLE_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de privacidad · Nutrilp',
  description: 'Qué datos trata Nutrilp, para qué, con quién se comparten y cómo ejercer tus derechos.',
};

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="text-sm text-muted-foreground">Última actualización: {LEGAL_UPDATED}</p>

      <p>
        Esta política explica qué datos trata Nutrilp, para qué, con quién se comparten y qué puedes hacer con ellos.
        Está escrita para que se entienda: si algo no queda claro, escribe a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Quién es el responsable</h2>
      <p>
        El responsable del tratamiento es <strong>{RESPONSIBLE_NAME}</strong>, persona física, con dirección de
        contacto <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Nutrilp es un proyecto personal, no una
        empresa.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Cuenta</strong>: tu correo electrónico y, si entras con Google, el nombre y la foto de perfil que
          Google nos facilita. La contraseña la gestiona Firebase Authentication: nosotros nunca la vemos.
        </li>
        <li>
          <strong>Perfil nutricional</strong>: los datos que introduces en la calculadora de objetivos (sexo, edad,
          peso, altura, nivel de actividad) y en la entrevista (gustos, alimentos a evitar, preferencia de dieta y{' '}
          <strong>alergias</strong>).
        </li>
        <li>
          <strong>Contenido que creas</strong>: tu plan semanal, tus recetas y sus fotos, tus alimentos, tu lista de la
          compra y las semanas que guardes en el historial. En la versión web, también el registro de lo que has
          comido, si lo usas.
        </li>
        <li>
          <strong>Datos técnicos mínimos</strong> de funcionamiento (por ejemplo, el número de peticiones de IA que
          haces al día, para aplicar el límite de uso).
        </li>
      </ul>
      <p>
        <strong>No usamos analítica ni cookies publicitarias</strong>, ni perfilamos tu comportamiento, ni vendemos
        datos a nadie.
      </p>

      <h2>Un aviso sobre las alergias</h2>
      <p>
        Las alergias alimentarias son datos de salud y el RGPD los protege de forma reforzada. Solo las tratamos porque
        tú decides contárnoslas, y con un único fin: que las recetas y los planes que te propone la IA las tengan en
        cuenta. Es un campo <strong>opcional</strong>: puedes dejarlo vacío o borrarlo cuando quieras desde la
        entrevista, y la app seguirá funcionando.
      </p>

      <h2>Para qué usamos los datos y con qué base legal</h2>
      <ul>
        <li>
          <strong>Prestarte el servicio</strong> (guardar tu plan, tus recetas, tu lista de la compra y calcular tus
          objetivos): ejecución del contrato que aceptas al crear la cuenta.
        </li>
        <li>
          <strong>Personalizar lo que genera la IA</strong> con tus gustos y tus alergias: tu consentimiento, que das
          al rellenar la entrevista y puedes retirar borrando esos campos.
        </li>
        <li>
          <strong>Mantener el servicio en pie</strong> (seguridad, prevención de abuso, límites de uso): interés
          legítimo.
        </li>
      </ul>

      <h2>Con quién se comparten</h2>
      <p>Nutrilp se apoya en estos proveedores, y solo en estos:</p>
      <ul>
        <li>
          <strong>Google Firebase</strong> (Authentication, Firestore, Storage y App Hosting): guarda tu cuenta, tus
          datos y las fotos de tus recetas, y sirve la web.
        </li>
        <li>
          <strong>Google Gemini</strong>: procesa lo que le pides a la IA. Recibe el texto de tu petición y, cuando la
          usas, el contexto necesario de tu plan y tus preferencias.
        </li>
        <li>
          <strong>Open Food Facts</strong>: base de datos pública que consultamos cuando buscas un producto del
          supermercado por su nombre. Solo viaja el término que buscas, nunca quién eres.
        </li>
      </ul>
      <p>
        Estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. Google ampara esas transferencias
        con las cláusulas contractuales tipo aprobadas por la Comisión Europea.
      </p>

      <h2>Las fotos de tu nevera</h2>
      <p>
        Cuando usas la función de fotografiar la nevera, <strong>la imagen se envía a Google Gemini para analizarla y
        no se guarda en ningún sitio</strong>: ni en nuestros servidores ni en tu cuenta. Lo único que se conserva es
        el resultado en texto, y solo si decides guardar alguna de las recetas propuestas. Las fotos que subes a tus
        recetas sí se guardan, porque son parte de la receta.
      </p>

      <h2>Cuánto tiempo se conservan</h2>
      <p>
        Mientras tengas la cuenta abierta. Cuando la borras, se eliminan tu perfil, tu plan, tus recetas y sus
        imágenes, tus alimentos privados, tu lista de la compra, tu historial y tu registro de comidas. No guardamos
        copias tuyas después.
      </p>
      <p>
        Ojo con una excepción: si has creado alimentos en el <strong>catálogo compartido</strong> o recetas del
        recetario público de Nutrilp, esos no se borran, porque las recetas de otras personas dependen de ellos. Van
        sin tu nombre.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes acceder a tus datos, rectificarlos, borrarlos, oponerte al tratamiento, pedir su limitación y
        solicitar una copia portable. Las dos vías rápidas:
      </p>
      <ul>
        <li>
          <strong>Borrar la cuenta tú mismo</strong>: en la app, Perfil → Borrar mi cuenta. Es inmediato e
          irreversible.
        </li>
        <li>
          <strong>Escribirnos</strong> a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> para cualquier otra
          petición.
        </li>
      </ul>
      <p>
        Si crees que no tratamos bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          aepd.es
        </a>
        ).
      </p>

      <h2>Menores</h2>
      <p>
        Nutrilp no está dirigido a menores de 14 años y no debe usarse sin el consentimiento de quien ejerza su
        tutela. Si detectamos una cuenta de un menor de esa edad, la eliminaremos.
      </p>

      <h2>Seguridad</h2>
      <p>
        El acceso va cifrado (HTTPS) y cada usuario solo puede leer y escribir sus propios datos, controlado en el
        servidor mediante las reglas de seguridad de Firestore. Aun así, ningún sistema es infalible: no subas a la
        app información sensible que no necesite para funcionar.
      </p>

      <h2>Cambios</h2>
      <p>
        Si esta política cambia de forma relevante, se avisará dentro de la app. La fecha de arriba indica la última
        versión.
      </p>
    </>
  );
}
