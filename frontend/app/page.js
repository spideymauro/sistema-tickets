import styles from './page.module.css';
import BotWidget from './components/BotWidget';

export default function Home() {
  return (
    <main className={styles.contenedor}>
      <section className={styles.hero}>
        <span className={styles.marca}>Soporte Azabache</span>
        <h1 className={styles.titulo}>¿Algo no está funcionando?</h1>
        <p className={styles.subtitulo}>
          Cuéntaselo a nuestro asistente. En un par de mensajes tendrás tu folio de seguimiento,
          sin necesidad de crear una cuenta.
        </p>
        <p className={styles.enlaceConsulta}>
          ¿Ya tienes un folio? <a href="/ticket/consultar">Consulta tu ticket aquí</a>
        </p>
      </section>
      <section className={styles.widgetZona}>
        <BotWidget />
      </section>
    </main>
  );
}
