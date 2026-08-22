import { ComicViewerDemo } from "./_components/comic-viewer-demo";
import { basicSamplePages } from "./_components/sample-pages";

import styles from "./page.module.css";

const Home = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ComicViewerDemo pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Basic image loading</h2>
        <p>
          Each page uses a normal JPEG URL together with its own low-resolution
          placeholder. The viewer displays the muted, blurred placeholder while
          the full image is loading.
        </p>
      </section>
    </div>
  </main>
);

export default Home;
