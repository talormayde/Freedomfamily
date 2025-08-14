export default function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200/70 dark:border-zinc-800/70">
      <div className="ff-wrap py-8 text-sm flex flex-wrap items-center justify-between gap-3 text-zinc-600 dark:text-zinc-300">
        <div>© {new Date().getFullYear()} Freedom Family</div>
        <nav className="flex gap-4">
          <a href="/office" className="hover:underline">Office</a>
          <a href="/library" className="hover:underline">Library</a>
          <a href="/living-room" className="hover:underline">Living Room</a>
          <a href="/kitchen" className="hover:underline">Kitchen</a>
        </nav>
      </div>
    </footer>
  );
}