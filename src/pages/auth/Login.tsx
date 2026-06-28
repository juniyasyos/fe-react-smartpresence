import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useLogo } from '../../contexts/LogoContext';
import './Login.css';
import logo from '../../assets/images/logo.png';
import userIcon from '../../assets/icons/user.webp';
import lockIcon from '../../assets/icons/gembok.webp';
import masukIcon from '../../assets/icons/masuk.webp';

// 150 quotes alternating themes: Presensi → Rumah Sakit → Kehidupan (repeat)
const QUOTES: string[] = [
  // 1 - Presensi
  "Kehadiran adalah bentuk tanggung jawab profesional kita.",
  // 2 - Rumah Sakit
  "Rumah sakit hebat dibangun oleh tim solid.",
  // 3 - Kehidupan
  "Hidup bermakna saat kita memberi yang terbaik.",
  // 4 - Presensi
  "Presensi tepat waktu cermin kedisiplinan sejati.",
  // 5 - Rumah Sakit
  "Pelayanan prima adalah jantung rumah sakit kita.",
  // 6 - Kehidupan
  "Setiap hari adalah kesempatan untuk menjadi lebih baik.",
  // 7 - Presensi
  "Hadir tepat waktu menghargai waktu rekan kerja.",
  // 8 - Rumah Sakit
  "Pasien sembuh karena dedikasi seluruh tenaga medis.",
  // 9 - Kehidupan
  "Kerja keras hari ini membuahkan hasil esok.",
  // 10 - Presensi
  "Rapat efektif dimulai dari kehadiran yang lengkap.",
  // 11 - Rumah Sakit
  "Kesehatan masyarakat adalah misi utama kita bersama.",
  // 12 - Kehidupan
  "Disiplin adalah jembatan menuju impian yang nyata.",
  // 13 - Presensi
  "Presensi digital memudahkan pencatatan kehadiran modern.",
  // 14 - Rumah Sakit
  "Senyum petugas menyembuhkan separuh kesakitan pasien.",
  // 15 - Kehidupan
  "Waktu yang berlalu tak pernah bisa kembali.",
  // 16 - Presensi
  "Setiap kehadiran adalah kontribusi nyata bagi tim.",
  // 17 - Rumah Sakit
  "Koordinasi antarunit memperkuat mutu layanan kesehatan.",
  // 18 - Kehidupan
  "Bersyukur atas hari ini, berusaha untuk esok.",
  // 19 - Presensi
  "Disiplin hadir membangun budaya kerja yang positif.",
  // 20 - Rumah Sakit
  "Rumah sakit bermutu lahir dari kerja sama.",
  // 21 - Kehidupan
  "Kebaikan kecil berdampak besar bagi sekitar kita.",
  // 22 - Presensi
  "Absensi tertib mendukung evaluasi kinerja yang akurat.",
  // 23 - Rumah Sakit
  "Setiap nyawa berharga, layani dengan sepenuh hati.",
  // 24 - Kehidupan
  "Jangan tunda kebaikan yang bisa dilakukan sekarang.",
  // 25 - Presensi
  "Kehadiran konsisten fondasi tim yang kuat solid.",
  // 26 - Rumah Sakit
  "Teknologi medis berkembang, semangat melayani tetap sama.",
  // 27 - Kehidupan
  "Sukses dimulai dari langkah kecil yang konsisten.",
  // 28 - Presensi
  "Rapat yang tertib dimulai dari presensi rapi.",
  // 29 - Rumah Sakit
  "Keselamatan pasien adalah prioritas utama rumah sakit.",
  // 30 - Kehidupan
  "Hidup adalah perjalanan, nikmati setiap prosesnya.",
  // 31 - Presensi
  "Presensi otomatis menghemat waktu dan tenaga administrasi.",
  // 32 - Rumah Sakit
  "Dokter dan perawat adalah pahlawan tanpa tanda.",
  // 33 - Kehidupan
  "Setiap tantangan membawa pelajaran yang sangat berharga.",
  // 34 - Presensi
  "Hadir di rapat berarti hadir untuk solusi.",
  // 35 - Rumah Sakit
  "Akreditasi rumah sakit cermin kualitas pelayanan kita.",
  // 36 - Kehidupan
  "Berani bermimpi besar, bekerja dengan tekun setiap.",
  // 37 - Presensi
  "Data presensi membantu pengambilan keputusan yang strategis.",
  // 38 - Rumah Sakit
  "Kebersihan rumah sakit mencerminkan kepedulian pada pasien.",
  // 39 - Kehidupan
  "Hari baru membawa harapan dan semangat baru.",
  // 40 - Presensi
  "Kedisiplinan kehadiran menciptakan lingkungan kerja yang harmonis.",
  // 41 - Rumah Sakit
  "Inovasi medis lahir dari kolaborasi antar profesi.",
  // 42 - Kehidupan
  "Belajar dari kemarin, hidup untuk hari ini.",
  // 43 - Presensi
  "Smart Presence mewujudkan presensi tanpa ribet kertas.",
  // 44 - Rumah Sakit
  "Pasien puas adalah keberhasilan seluruh tim medis.",
  // 45 - Kehidupan
  "Keberhasilan milik mereka yang tak pernah menyerah.",
  // 46 - Presensi
  "Catatan kehadiran rapi memudahkan pelaporan bulanan.",
  // 47 - Rumah Sakit
  "Rumah sakit adalah tempat harapan dan kesembuhan.",
  // 48 - Kehidupan
  "Jadilah versi terbaik dari dirimu setiap hari.",
  // 49 - Presensi
  "Presensi rapat menunjukkan komitmen pada organisasi kita.",
  // 50 - Rumah Sakit
  "Tenaga kesehatan berdedikasi layak mendapat apresiasi tinggi.",
  // 51 - Kehidupan
  "Senyuman tulus mampu mencerahkan hari orang lain.",
  // 52 - Presensi
  "Kehadiran rutin menjaga komunikasi tim tetap solid.",
  // 53 - Rumah Sakit
  "Pelayanan cepat dan tepat menyelamatkan banyak nyawa.",
  // 54 - Kehidupan
  "Berbagi ilmu memperkaya jiwa dan pikiran kita.",
  // 55 - Presensi
  "Absensi digital langkah maju menuju efisiensi kerja.",
  // 56 - Rumah Sakit
  "Komitmen pada mutu menjadikan rumah sakit terpercaya.",
  // 57 - Kehidupan
  "Sabar dan tekun kunci meraih setiap tujuan.",
  // 58 - Presensi
  "Tepat hadir, tepat mulai, tepat selesai rapat.",
  // 59 - Rumah Sakit
  "Setiap tindakan medis harus penuh kehati-hatian profesional.",
  // 60 - Kehidupan
  "Kebahagiaan sejati datang dari hal sederhana sehari-hari.",
  // 61 - Presensi
  "Presensi bukan formalitas, tapi wujud profesionalisme nyata.",
  // 62 - Rumah Sakit
  "Rumah sakit yang bersih mempercepat proses kesembuhan.",
  // 63 - Kehidupan
  "Mimpi besar dimulai dari keberanian langkah pertama.",
  // 64 - Presensi
  "Rapat produktif tercipta dari peserta yang hadir.",
  // 65 - Rumah Sakit
  "Kerja sama tim medis menghasilkan perawatan terbaik.",
  // 66 - Kehidupan
  "Hidup penuh warna saat kita tetap bersyukur.",
  // 67 - Presensi
  "Kehadiran aktif mendorong diskusi yang lebih bermakna.",
  // 68 - Rumah Sakit
  "Standar pelayanan tinggi kunci kepercayaan masyarakat.",
  // 69 - Kehidupan
  "Setiap detik berharga, gunakan dengan bijak selalu.",
  // 70 - Presensi
  "Presensi teratur mencerminkan loyalitas pada pekerjaan kita.",
  // 71 - Rumah Sakit
  "Teknologi kesehatan membantu diagnosis lebih cepat akurat.",
  // 72 - Kehidupan
  "Kegagalan adalah guru terbaik menuju kesuksesan sejati.",
  // 73 - Presensi
  "Catatan hadir mendukung transparansi dalam manajemen tim.",
  // 74 - Rumah Sakit
  "Empati pada pasien adalah nilai utama pelayanan.",
  // 75 - Kehidupan
  "Hari ini lebih baik dari hari kemarin.",
  // 76 - Presensi
  "Satu klik presensi, seribu manfaat untuk organisasi.",
  // 77 - Rumah Sakit
  "Pendidikan kesehatan berkelanjutan meningkatkan kompetensi tenaga medis.",
  // 78 - Kehidupan
  "Kesabaran mengantarkan kita pada hasil yang indah.",
  // 79 - Presensi
  "Rapat berkualitas butuh peserta yang hadir lengkap.",
  // 80 - Rumah Sakit
  "Kasih sayang dalam merawat mempercepat kesembuhan pasien.",
  // 81 - Kehidupan
  "Jangan berhenti belajar meski sudah merasa bisa.",
  // 82 - Presensi
  "Disiplin presensi membentuk karakter pekerja yang tangguh.",
  // 83 - Rumah Sakit
  "Rumah sakit modern mengutamakan keselamatan dan kenyamanan.",
  // 84 - Kehidupan
  "Ketulusan hati membuka pintu kebaikan tanpa batas.",
  // 85 - Presensi
  "Kehadiran penuh menandakan organisasi yang sehat kuat.",
  // 86 - Rumah Sakit
  "Setiap senyum perawat memberi semangat pada pasien.",
  // 87 - Kehidupan
  "Perubahan dimulai dari keberanian untuk memulai sesuatu.",
  // 88 - Presensi
  "Presensi cerdas untuk rumah sakit yang lebih maju.",
  // 89 - Rumah Sakit
  "Mutu pelayanan kesehatan adalah tanggung jawab bersama.",
  // 90 - Kehidupan
  "Hidup bermakna saat bermanfaat bagi orang lain.",
  // 91 - Presensi
  "Hadir dengan semangat, pulang membawa solusi terbaik.",
  // 92 - Rumah Sakit
  "Fasilitas lengkap mendukung pelayanan kesehatan yang optimal.",
  // 93 - Kehidupan
  "Tetap semangat, badai pasti berlalu pada waktunya.",
  // 94 - Presensi
  "Rekap kehadiran akurat membantu penilaian kinerja profesional.",
  // 95 - Rumah Sakit
  "Komunikasi efektif antarmedis mengurangi risiko kesalahan perawatan.",
  // 96 - Kehidupan
  "Bekerja dengan ikhlas mendatangkan berkah dan ketenangan.",
  // 97 - Presensi
  "Presensi digital mengurangi antrian dan pemborosan kertas.",
  // 98 - Rumah Sakit
  "Rumah sakit yang ramah membuat pasien nyaman.",
  // 99 - Kehidupan
  "Kebersamaan adalah kekuatan terbesar dalam setiap perjuangan.",
  // 100 - Presensi
  "Setiap scan barcode adalah bukti kehadiran nyata.",
  // 101 - Rumah Sakit
  "Tenaga medis sehat mampu merawat dengan maksimal.",
  // 102 - Kehidupan
  "Menebar kebaikan tak pernah ada ruginya sama.",
  // 103 - Presensi
  "Rapat teratur menjaga ritme kerja tetap stabil.",
  // 104 - Rumah Sakit
  "Program kesehatan preventif mengurangi beban rumah sakit.",
  // 105 - Kehidupan
  "Waktu tidak menunggu, manfaatkan sebaik mungkin selalu.",
  // 106 - Presensi
  "Komitmen hadir adalah langkah awal menuju sukses.",
  // 107 - Rumah Sakit
  "Setiap pasien berhak mendapat pelayanan terbaik kita.",
  // 108 - Kehidupan
  "Semangat pagi menentukan produktivitas sepanjang hari ini.",
  // 109 - Presensi
  "Kehadiran menciptakan kesempatan emas untuk berkembang bersama.",
  // 110 - Rumah Sakit
  "Kolaborasi lintas profesi memperkuat sistem kesehatan kita.",
  // 111 - Kehidupan
  "Rasa syukur membuat hidup terasa lebih ringan.",
  // 112 - Presensi
  "Presensi tertib memudahkan administrasi rumah sakit setiap hari.",
  // 113 - Rumah Sakit
  "Keunggulan rumah sakit terletak pada sumber daya manusia.",
  // 114 - Kehidupan
  "Jalan panjang dimulai dari satu langkah berani.",
  // 115 - Presensi
  "Data kehadiran fondasi perencanaan sumber daya tepat.",
  // 116 - Rumah Sakit
  "Budaya safety first menjaga keselamatan pasien selalu.",
  // 117 - Kehidupan
  "Jangan takut gagal, takutlah untuk tidak mencoba.",
  // 118 - Presensi
  "Presensi lancar operasional rumah sakit makin efisien.",
  // 119 - Rumah Sakit
  "Peningkatan mutu berkelanjutan adalah kunci akreditasi berhasil.",
  // 120 - Kehidupan
  "Keikhlasan dalam bekerja menghadirkan kebahagiaan yang tulus.",
  // 121 - Presensi
  "Rapat yang fokus menyelesaikan masalah lebih cepat.",
  // 122 - Rumah Sakit
  "Obat terbaik adalah kasih sayang dan perhatian.",
  // 123 - Kehidupan
  "Hari ini adalah hadiah, makanya disebut present.",
  // 124 - Presensi
  "Kehadiran penuh membuat diskusi lebih kaya bermakna.",
  // 125 - Rumah Sakit
  "Rumah sakit maju karena inovasi tanpa henti.",
  // 126 - Kehidupan
  "Kesederhanaan adalah kunci kebahagiaan yang sesungguhnya.",
  // 127 - Presensi
  "Kedisiplinan presensi mendukung akreditasi rumah sakit kita.",
  // 128 - Rumah Sakit
  "Pelayanan dari hati menyentuh jiwa setiap pasien.",
  // 129 - Kehidupan
  "Berbuat baik tanpa pamrih, hasilnya pasti indah.",
  // 130 - Presensi
  "Smart Presence solusi modern pencatatan kehadiran efektif.",
  // 131 - Rumah Sakit
  "Kebersihan dan kerapian rumah sakit tanggung jawab semua.",
  // 132 - Kehidupan
  "Optimis adalah magnet kebaikan dalam kehidupan kita.",
  // 133 - Presensi
  "Setiap presensi membangun data untuk keputusan penting.",
  // 134 - Rumah Sakit
  "Perawat adalah malaikat penjaga di rumah sakit.",
  // 135 - Kehidupan
  "Masa depan cerah milik mereka yang berusaha.",
  // 136 - Presensi
  "Hadir konsisten membuktikan loyalitas pada institusi kita.",
  // 137 - Rumah Sakit
  "Standar internasional menjadi acuan layanan rumah sakit.",
  // 138 - Kehidupan
  "Tidak ada usaha yang sia-sia dalam kehidupan.",
  // 139 - Presensi
  "Budaya disiplin hadir menjadi keunggulan kompetitif kita.",
  // 140 - Rumah Sakit
  "Kesehatan adalah investasi paling berharga bagi semua.",
  // 141 - Kehidupan
  "Cintai pekerjaanmu dan hasilnya akan luar biasa.",
  // 142 - Presensi
  "Presensi cermat manajemen rumah sakit lebih akurat.",
  // 143 - Rumah Sakit
  "Rumah sakit ramah anak menciptakan suasana nyaman.",
  // 144 - Kehidupan
  "Perjalanan seribu mil dimulai dari satu langkah.",
  // 145 - Presensi
  "Rapat hari ini solusi lebih baik esok.",
  // 146 - Rumah Sakit
  "Profesionalisme medis menjamin keselamatan setiap pasien kita.",
  // 147 - Kehidupan
  "Bersama kita kuat, sendiri kita rapuh mudah.",
  // 148 - Presensi
  "Kebersamaan di rapat menghasilkan keputusan yang bijak.",
  // 149 - Rumah Sakit
  "Dedikasi tanpa batas untuk kesehatan masyarakat Indonesia.",
  // 150 - Kehidupan
  "Tersenyumlah, karena hidup ini terlalu indah dilewatkan.",
];

const Login: React.FC = () => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [isFading, setIsFading] = useState(false);
  const [checkingSSO, setCheckingSSO] = useState(true);

  const navigate = useNavigate();
  const auth = useAuthStore();
  const { logoKiriSidebar } = useLogo();

  // Redirect if already authenticated
  if (auth.isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  // Handle SSO Redirect
  useEffect(() => {
    const checkSSOMode = async () => {
      try {
        const data = await authService.getAuthMode();
        if (data.sso_enabled && data.sso_login_url) {
          window.location.href = data.sso_login_url;
        } else {
          setCheckingSSO(false);
        }
      } catch (err) {
        setCheckingSSO(false);
      }
    };
    checkSSOMode();
  }, []);

  // Rotate quotes every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setIsFading(false);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.login({ nip, password });
      auth.login(response.token, response.user);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Login gagal. Silakan coba lagi.');
      } else {
        setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSSO) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-body)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoKiriSidebar || logo} alt="Rumah Sakit Citra Husada Logo" className="login-logo" width="140" height="140" />
          <h1 className="login-title">Smart Presence</h1>
          <div className="login-quote-wrapper">
            <p className={`login-quote ${isFading ? 'fade-out' : 'fade-in'}`}>
              "{QUOTES[quoteIndex]}"
            </p>
          </div>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nip">NIP</label>
            <div className="input-wrapper">
              <img src={userIcon} alt="user icon" className="input-icon" />
              <input
                type="text"
                id="nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Masukkan NIP"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <img src={lockIcon} alt="lock icon" className="input-icon" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="login-spinner"></span>
                Memproses...
              </>
            ) : (
              <>
                <img src={masukIcon} alt="login icon" className="btn-icon" />
                Masuk
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
