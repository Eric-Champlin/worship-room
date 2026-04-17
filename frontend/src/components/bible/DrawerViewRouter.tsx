import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'
import { ChapterPickerView } from '@/components/bible/books/ChapterPickerView'

const VIEW_COMPONENTS: Record<
  string,
  React.ComponentType<{ onClose: () => void }>
> = {
  books: BooksDrawerContent,
  chapters: ChapterPickerView,
}

interface DrawerViewRouterProps {
  onClose: () => void
}

export function DrawerViewRouter({ onClose }: DrawerViewRouterProps) {
  const { currentView } = useBibleDrawer()
  const Component = VIEW_COMPONENTS[currentView.type]
  if (!Component) return null

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full w-full">
        <Component onClose={onClose} />
      </div>
    </div>
  )
}
