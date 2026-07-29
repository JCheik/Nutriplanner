import type { Metadata } from 'next';

import { CONTACT_EMAIL, LEGAL_UPDATED, RESPONSIBLE_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos de uso · Nutrilp',
  description: 'Condiciones de uso de Nutrilp, incluida la información sobre el uso de inteligencia artificial.',
};

export default function TerminosPage() {
  return (
    <>
      <h1>Términos de uso</h1>
      <p className="text-sm text-muted-foreground">Última actualización: {LEGAL_UPDATED}</p>

      <p>
        Al crear una cuenta en Nutrilp aceptas estas condiciones. El servicio lo presta{' '}
        <strong>{RESPONSIBLE_NAME}</strong> como proyecto personal; puedes escribir a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> para cualquier cosa.
      </p>

      <h2>Qué es Nutrilp</h2>
      <p>
        Una herramienta para <strong>organizar tu semana de comidas</strong>: planificar, tener a mano tus recetas y
        generar la lista de la compra ajustada a tus raciones. No es una app de dieta estricta ni un servicio de
        seguimiento clínico.
      </p>

      <h2>Nutrilp no da consejo médico</h2>
      <p>
        Las calorías, los macronutrientes y las recomendaciones que ves son <strong>estimaciones orientativas</strong>,
        calculadas a partir de fórmulas estándar y de bases de datos de alimentos que pueden contener errores. No
        constituyen consejo médico, nutricional ni dietético profesional, y no sustituyen a un profesional sanitario.
      </p>
      <p>
        Si tienes una condición médica, alergias, estás embarazada, en periodo de lactancia, o sigues un tratamiento,
        consulta con un profesional antes de cambiar tu alimentación. <strong>Comprueba siempre los ingredientes</strong>{' '}
        de lo que vayas a cocinar: la app puede equivocarse y una alergia no perdona.
      </p>

      <h2>Uso de inteligencia artificial</h2>
      <p>
        Nutrilp usa inteligencia artificial generativa (modelos Gemini, de Google) en varias funciones, y queremos que
        sepas exactamente cuándo. Se usa IA para:
      </p>
      <ul>
        <li>el <strong>asistente</strong> con el que hablas dentro de la app,</li>
        <li><strong>autocompletar</strong> los huecos de tu plan semanal,</li>
        <li><strong>crear recetas</strong> a partir de lo que le describes,</li>
        <li><strong>analizar la foto de tu nevera</strong> y proponerte qué cocinar,</li>
        <li><strong>importar recetas</strong> desde un enlace y estimar sus valores nutricionales.</li>
      </ul>
      <p>
        Cuando hablas con el asistente, <strong>estás interactuando con un sistema de inteligencia artificial, no con
        una persona</strong>. Todo lo que produce —textos, recetas, cantidades y valores nutricionales— es{' '}
        <strong>contenido generado artificialmente</strong> y puede ser inexacto o directamente incorrecto: revísalo
        antes de fiarte, sobre todo si tienes alergias o restricciones. Ninguna acción de la IA sobre tu plan es
        definitiva: puedes deshacerla, y las que borran datos te piden confirmación antes.
      </p>
      <p>
        Esta información se ofrece en cumplimiento de las obligaciones de transparencia del Reglamento (UE) 2024/1689
        de Inteligencia Artificial.
      </p>

      <h2>Tu cuenta</h2>
      <ul>
        <li>Eres responsable de mantener tus credenciales a salvo y de lo que se haga desde tu cuenta.</li>
        <li>Necesitas al menos 14 años para usar Nutrilp.</li>
        <li>
          Puedes <strong>borrar tu cuenta</strong> cuando quieras desde Perfil → Borrar mi cuenta. Es inmediato e
          irreversible.
        </li>
      </ul>

      <h2>Tu contenido</h2>
      <p>
        Tus recetas, tus fotos y tu plan <strong>siguen siendo tuyos</strong>. Solo nos das el permiso técnico
        imprescindible para guardarlos y mostrártelos dentro del servicio. No los publicamos, no los usamos con fines
        comerciales y no los empleamos para entrenar modelos de IA.
      </p>
      <p>
        Si añades contenido al recetario público de Nutrilp o al catálogo compartido de alimentos, ten en cuenta que
        será visible para el resto de usuarios y que puede permanecer aunque borres tu cuenta, porque las recetas de
        otras personas dependen de él.
      </p>

      <h2>Uso aceptable</h2>
      <p>No uses Nutrilp para subir contenido ilegal o de terceros sin permiso, para intentar acceder a datos de otras personas, para saltarte los límites técnicos del servicio ni para automatizar peticiones masivas a la IA.</p>

      <h2>Servicio en fase de pruebas</h2>
      <p>
        Nutrilp está en desarrollo activo y se ofrece <strong>tal cual, sin garantía de disponibilidad ni de ausencia
        de errores</strong>. Puede haber cortes, cambios de funcionalidad o pérdida de datos. Si tus recetas son
        importantes para ti, guarda una copia por tu cuenta (el cuadrante semanal se puede exportar en PDF).
      </p>
      <p>
        En la medida en que lo permita la ley, no se asume responsabilidad por daños derivados del uso del servicio,
        de decisiones alimentarias tomadas a partir de sus estimaciones, ni de la indisponibilidad del mismo.
      </p>

      <h2>Cambios y cierre</h2>
      <p>
        Estas condiciones pueden cambiar; los cambios relevantes se avisarán en la app. Podemos suspender cuentas que
        incumplan estos términos, avisando salvo que sea inviable.
      </p>

      <h2>Ley aplicable</h2>
      <p>
        Se aplica la legislación española. Para cualquier conflicto, los juzgados competentes serán los que
        correspondan según la normativa de consumidores.
      </p>
    </>
  );
}
