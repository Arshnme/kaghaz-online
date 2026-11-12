"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  FileText,
  MoreVertical,
  Lock,
  Globe,
  Star,
  LogOut,
  Settings,
  Search,
  Filter,
  Grid,
  List,
  Trash2,
  Copy,
  Edit3,
  Calendar,
  User,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  GripVertical,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from "@/hooks/use-toast"

// SortableDocumentCard component - Memoized for performance
const SortableDocumentCard = React.memo(function SortableDocumentCard({
  doc,
  viewMode,
  profile,
  onEdit,
  onCopyLink,
  onToggleVisibility,
  onSetAsMain,
  onDelete,
  formatDate
}: {
  doc: Document
  viewMode: "grid" | "list"
  profile: Profile
  onEdit: () => void
  onCopyLink: () => void
  onToggleVisibility: () => void
  onSetAsMain: () => void
  onDelete: () => void
  formatDate: (date: string) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-0 shadow-md overflow-hidden ${isDragging ? "shadow-2xl rotate-1 opacity-80 scale-105" : ""
        } ${doc.is_main ? "ring-2 ring-[#001D51] ring-opacity-50" : ""} ${viewMode === "list" ? "flex items-center" : ""
        }`}
      onClick={(e) => {
        // Only navigate if not clicking on dropdown or drag handle
        const target = e.target as HTMLElement
        if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-drag-handle]')) {
          onEdit()
        }
      }}
    >
      <CardHeader className={`pb-3 ${viewMode === "list" ? "flex-1" : ""}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors"
              data-drag-handle
              onClick={(e) => e.stopPropagation()}
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-[#001D51] flex items-center gap-2 mb-2">
                {doc.is_main && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                <span className="line-clamp-1" title={doc.title}>
                  {doc.title.length > 50 ? doc.title.substring(0, 50) + "..." : doc.title}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                {formatDate(doc.updated_at)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-dropdown-trigger onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit3 className="w-4 h-4 ml-2" />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onCopyLink()
                }}
              >
                <Copy className="w-4 h-4 ml-2" />
                کپی لینک
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisibility()
                }}
              >
                {doc.is_public ? (
                  <>
                    <Lock className="w-4 h-4 ml-2" />
                    خصوصی کردن
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 ml-2" />
                    عمومی کردن
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onSetAsMain()
                }}
              >
                <Star className="w-4 h-4 ml-2" />
                تنظیم به عنوان اصلی
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      {viewMode === "grid" && (
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 space-x-reverse">
                {doc.is_public ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Globe className="w-3 h-3 ml-1" />
                    عمومی
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    <Lock className="w-3 h-3 ml-1" />
                    خصوصی
                  </Badge>
                )}
                {doc.password && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    رمزدار
                  </Badge>
                )}
                {doc.publish_to_profile && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <User className="w-3 h-3 ml-1" />
                    در پروفایل
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {doc.content ?
                (doc.content.replace(/<[^>]*>/g, '').substring(0, 100) + "...") :
                "سند خالی"
              }
            </p>
            <div className="text-xs text-gray-400 font-mono truncate" dir="ltr">
              /{profile?.username}/{doc.document_id}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
})

interface Document {
  id: string
  title: string
  document_id: string
  content: string
  is_public: boolean
  is_main: boolean
  publish_to_profile?: boolean
  password?: string
  user_id: string
  order_index: number
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  username: string
  full_name: string
  email: string
  avatar_url?: string
}

interface DashboardProps {
  user: any
  profile: Profile
  documents: Document[]
}

export default function Dashboard({ user, profile, documents: initialDocuments }: DashboardProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocId, setNewDocId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all")

  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Memoize expensive calculations
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter =
        filterType === "all" || (filterType === "public" && doc.is_public) || (filterType === "private" && !doc.is_public)

      return matchesSearch && matchesFilter
    })
  }, [documents, searchQuery, filterType])

  const publicDocumentsCount = useMemo(() => {
    return documents.filter((d) => d.is_public).length
  }, [documents])

  useEffect(() => {
    // Generate document ID from title
    if (newDocTitle) {
      const generatedId = newDocTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 30)
      setNewDocId(generatedId)
    }
  }, [newDocTitle])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim() || !newDocId.trim()) {
      setError("لطفاً تمام فیلدها را پر کنید")
      return
    }

    // Validate document ID format
    const docIdRegex = /^[a-z0-9-]+$/
    if (!docIdRegex.test(newDocId.trim())) {
      setError("شناسه سند فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و خط تیره باشد")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          document_id: newDocId.trim(),
          content: "",
          is_public: false,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create document")
      }

      if (result.document) {
        // Add to documents list with optimistic update
        const newDocument = {
          ...result.document,
          order_index: documents.length
        }
        setDocuments([...documents, newDocument])
        setSuccess("سند با موفقیت ایجاد شد!")
        setNewDocTitle("")
        setNewDocId("")
        setIsCreateDialogOpen(false)

        // Navigate to editor immediately for better UX
        router.push(`/editor/${result.document.id}`)
      } else {
        throw new Error("No document returned from API")
      }
    } catch (error: any) {
      console.error("Create document error:", error)
      setError(error.message || "خطا در ایجاد سند")
    } finally {
      setIsLoading(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && over) {
      const oldIndex = documents.findIndex((item) => item.id === active.id)
      const newIndex = documents.findIndex((item) => item.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedItems = arrayMove(documents, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order_index: index,
        }))

        // Optimistic update for immediate UI response
        setDocuments(updatedItems)

        // Update in database in background
        try {
          // Only update the items that actually changed position
          const itemsToUpdate = updatedItems.filter((item, index) => {
            const originalItem = documents.find(doc => doc.id === item.id)
            return originalItem && originalItem.order_index !== index
          })

          // Update in parallel for better performance
          await Promise.all(
            itemsToUpdate.map(item =>
              fetch(`/api/documents/${item.id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ order_index: item.order_index }),
              })
            )
          )
        } catch (error) {
          console.error("Reorder error:", error)
          // Revert on error
          setDocuments(documents)
        }
      }
    }
  }, [documents])

  const toggleDocumentVisibility = useCallback(async (docId: string, isPublic: boolean) => {
    // Optimistic update for better UX
    setDocuments(prevDocs =>
      prevDocs.map((doc) => (doc.id === docId ? { ...doc, is_public: !isPublic } : doc))
    )

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_public: !isPublic }),
      })

      if (response.ok) {
        toast({
          title: "وضعیت سند تغییر کرد",
          description: !isPublic ? "سند عمومی شد" : "سند خصوصی شد",
        })
      } else {
        // Revert optimistic update on error
        setDocuments(prevDocs =>
          prevDocs.map((doc) => (doc.id === docId ? { ...doc, is_public: isPublic } : doc))
        )
        setError("خطا در تغییر وضعیت سند")
      }
    } catch (error) {
      // Revert optimistic update on error
      setDocuments(prevDocs =>
        prevDocs.map((doc) => (doc.id === docId ? { ...doc, is_public: isPublic } : doc))
      )
      console.error("Toggle visibility error:", error)
      setError("خطا در تغییر وضعیت سند")
    }
  }, [toast])

  const setAsMainDocument = useCallback(async (docId: string) => {
    // Optimistic update
    const previousState = documents.map(doc => ({ ...doc }))
    setDocuments(prevDocs =>
      prevDocs.map((doc) => ({
        ...doc,
        is_main: doc.id === docId,
      }))
    )

    try {
      // Update all documents in parallel
      const updatePromises = documents.map((doc) =>
        fetch(`/api/documents/${doc.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_main: doc.id === docId }),
        })
      )

      await Promise.all(updatePromises)

      toast({
        title: "سند اصلی تنظیم شد",
        description: "سند به عنوان سند اصلی انتخاب شد",
      })
    } catch (error) {
      // Revert on error
      setDocuments(previousState)
      console.error("Set main document error:", error)
      setError("خطا در تنظیم سند اصلی")
    }
  }, [documents, toast])

  const deleteDocument = useCallback(async (docId: string) => {
    // Optimistic update
    const documentToDelete = documents.find(doc => doc.id === docId)
    setDocuments(prevDocs => prevDocs.filter((doc) => doc.id !== docId))

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "سند حذف شد",
          description: "سند با موفقیت حذف شد",
        })
      } else {
        // Revert on error
        if (documentToDelete) {
          setDocuments(prevDocs => [...prevDocs, documentToDelete].sort((a, b) => a.order_index - b.order_index))
        }
        setError("خطا در حذف سند")
      }
    } catch (error) {
      // Revert on error
      if (documentToDelete) {
        setDocuments(prevDocs => [...prevDocs, documentToDelete].sort((a, b) => a.order_index - b.order_index))
      }
      console.error("Delete document error:", error)
      setError("خطا در حذف سند")
    }
  }, [documents, toast])

  const copyDocumentLink = useCallback((doc: Document) => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/${profile.username}/${doc.document_id}`
    navigator.clipboard.writeText(link)
    toast({
      title: "لینک کپی شد!",
      description: "لینک سند در کلیپ‌بورد کپی شد",
    })
  }, [profile.username, toast])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [])

  // Memoize document action handlers to prevent re-renders
  const createDocumentHandlers = useCallback((doc: Document) => ({
    onEdit: () => router.push(`/editor/${doc.id}`),
    onCopyLink: () => copyDocumentLink(doc),
    onToggleVisibility: () => toggleDocumentVisibility(doc.id, doc.is_public),
    onSetAsMain: () => setAsMainDocument(doc.id),
    onDelete: () => {
      if (confirm("آیا مطمئن هستید؟")) {
        deleteDocument(doc.id)
      }
    }
  }), [router, copyDocumentLink, toggleDocumentVisibility, setAsMainDocument, deleteDocument])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-[#001D51] to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#001D51] flex items-center gap-2">
                  کاغذ آنلاین
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </h1>
                <p className="text-sm text-gray-500 hidden md:block">خوش آمدید، {profile?.full_name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#001D51] to-blue-600 hover:from-[#001D51]/90 hover:to-blue-600/90 text-white shadow-lg">
                  <Plus className="w-4 h-4 md:ml-2" />
                  <span className="hidden md:inline">سند جدید</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    ایجاد سند جدید
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان سند</Label>
                    <Input
                      id="title"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="عنوان سند را وارد کنید"
                      className="text-right"
                      maxLength={100}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="docId">شناسه سند</Label>
                    <Input
                      id="docId"
                      value={newDocId}
                      onChange={(e) => setNewDocId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="document-id"
                      className="text-right"
                      dir="ltr"
                      maxLength={30}
                      disabled={isLoading}
                    />
                    <p className="text-sm text-gray-500">
                      لینک سند: /{profile?.username}/{newDocId}
                    </p>
                  </div>

                  {/* Alerts */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
                      انصراف
                    </Button>
                    <Button
                      onClick={handleCreateDocument}
                      disabled={isLoading || !newDocTitle.trim() || !newDocId.trim()}
                      className="bg-[#001D51] hover:bg-[#001D51]/90 text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          در حال ایجاد...
                        </>
                      ) : (
                        "ایجاد"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2 space-x-reverse">
                  <div className="w-8 h-8 bg-[#001D51] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden md:block">{profile?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/${profile?.username}/profile`)}>
                  <Settings className="w-4 h-4 mr-[4px] ml-2" />
                  تنظیمات
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-[4px] ml-2" />
                  خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {documents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-600 mb-3">هنوز سندی ندارید</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              اولین سند خود را ایجاد کنید و شروع به نوشتن کنید. می‌توانید آن را با دیگران به اشتراک بگذارید.
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-[#001D51] to-blue-600 hover:from-[#001D51]/90 hover:to-blue-600/90 text-white shadow-lg"
              size="lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              ایجاد اولین سند
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center space-x-4 space-x-reverse">
                <h2 className="text-2xl font-semibold text-[#001D51]">اسناد شما ({documents.length})</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {publicDocumentsCount} عمومی
                </Badge>
              </div>

              <div className="flex items-center space-x-3 space-x-reverse w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="جستجو در اسناد..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 ml-2" />
                      فیلتر
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterType("all")}>همه اسناد</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("public")}>اسناد عمومی</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType("private")}>اسناد خصوصی</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-lg rounded-l-none"
                  >
                    <Grid className={`w-4 h-4 ${viewMode === "grid" ? "text-white" : ""}`} />

                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-lg rounded-r-none"
                  >
                    <Grid className={`w-4 h-4 ${viewMode === "list" ? "text-white" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Documents */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredDocuments.map(doc => doc.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={
                    viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-4"
                  }
                >
                  {filteredDocuments.map((doc) => {
                    const handlers = createDocumentHandlers(doc)
                    return (
                      <SortableDocumentCard
                        key={doc.id}
                        doc={doc}
                        viewMode={viewMode}
                        profile={profile}
                        {...handlers}
                        formatDate={formatDate}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {filteredDocuments.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">نتیجه‌ای یافت نشد</h3>
                <p className="text-gray-500">برای &quot;{searchQuery}&quot; سندی پیدا نشد</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
