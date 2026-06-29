export const runtime = 'edge';

export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh', 
      textAlign: 'center',
      padding: '2rem',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#1A1B1F' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', color: '#4A4B50' }}>Không tìm thấy trang</h2>
      <p style={{ margin: '0 0 2rem 0', color: '#6A6B70' }}>Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <a href="/" style={{ 
        padding: '0.75rem 1.5rem', 
        backgroundColor: '#228be6', 
        color: '#fff', 
        textDecoration: 'none', 
        borderRadius: '4px',
        fontWeight: 'bold'
      }}>
        Quay lại trang chủ
      </a>
    </div>
  );
}
