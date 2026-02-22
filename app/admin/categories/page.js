"use client"
import { useState, useEffect } from "react"
import AdminLayout from "../../components/AdminLayout"
import { CldImage } from "next-cloudinary"
import withAdminAuth from "../../components/withAdminAuth"

function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [activeTab, setActiveTab] = useState("categories")
  const [categorySearchTerm, setCategorySearchTerm] = useState("")
  const [subcategorySearchTerm, setSubcategorySearchTerm] = useState("")
  const [categoryPage, setCategoryPage] = useState(1)
  const [subcategoryPage, setSubcategoryPage] = useState(1)
  const itemsPerPage = 20

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    sortOrder: 0,
    isActive: true,
  })
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: "",
    description: "",
    image: "",
    categoryId: "",
    order: 0,
    isActive: true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState("")

  useEffect(() => {
    fetchCategories()
    fetchSubcategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const timestamp = Date.now()
      const response = await fetch(`/api/categories?includeInactive=true&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        setError("Failed to fetch categories")
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      setError("Failed to fetch categories")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubcategories = async () => {
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/subcategories?includeInactive=true&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data.subcategories || [])
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error)
    }
  }

  const handleSubmitSubcategory = async (e) => {
    e.preventDefault()

    if (!subcategoryFormData.name || !subcategoryFormData.categoryId) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      setError("")

      let imageUrl = subcategoryFormData.image
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const subcategoryData = {
        ...subcategoryFormData,
        image: imageUrl,
        order: Number.parseInt(subcategoryFormData.order) || 0, // Ensure order is a number
      }

      const url = editingSubcategory ? `/api/subcategories/${editingSubcategory._id}` : "/api/subcategories"

      const method = editingSubcategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subcategoryData),
      })

      if (response.ok) {
        await fetchSubcategories()
        resetSubcategoryForm()
        setShowSubcategoryForm(false)
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to save subcategory")
      }
    } catch (error) {
      console.error("Error saving subcategory:", error)
      setError("Failed to save subcategory: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory)
    setSubcategoryFormData({
      name: subcategory.name,
      description: subcategory.description || "",
      image: subcategory.image || "",
      categoryId: subcategory.category._id || subcategory.category,
      order: subcategory.order || 0,
      isActive: subcategory.isActive,
    })
    setImageFile(null)
    setImagePreview("")
    setShowSubcategoryForm(true)
  }

  const handleDeleteSubcategory = async (subcategory) => {
    if (!confirm(`Are you sure you want to delete "${subcategory.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/subcategories/${subcategory._id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchSubcategories()
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete subcategory")
      }
    } catch (error) {
      console.error("Error deleting subcategory:", error)
      setError("Failed to delete subcategory")
    } finally {
      setLoading(false)
    }
  }

  const resetSubcategoryForm = () => {
    setSubcategoryFormData({
      name: "",
      description: "",
      image: "",
      categoryId: "",
      order: 0,
      isActive: true,
    })
    setEditingSubcategory(null)
    setImageFile(null)
    setImagePreview("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.description) {
      setError("Please fill in all required fields")
      return
    }

    if (!formData.image && !imageFile) {
      setError("Please select an image for the category")
      return
    }

    try {
      setLoading(true)
      setError("")

      let imageUrl = formData.image
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      const categoryData = {
        ...formData,
        image: imageUrl,
        sortOrder: Number.parseInt(formData.sortOrder) || 0, // Ensure sortOrder is a number
      }

      const url = editingCategory ? `/api/categories/${editingCategory.slug}` : "/api/categories"

      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryData),
      })

      if (response.ok) {
        await fetchCategories()
        resetForm()
        setShowForm(false)
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to save category")
      }
    } catch (error) {
      console.error("Error saving category:", error)
      setError("Failed to save category: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    setImageFile(null)
    setImagePreview("")
    setShowForm(true)
  }

  const handleDelete = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/categories/${category.slug}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchCategories()
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      setError("Failed to delete category")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image: "",
      sortOrder: 0,
      isActive: true,
    })
    setEditingCategory(null)
    setImageFile(null)
    setImagePreview("")
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB")
        return
      }

      setImageFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async () => {
    if (!imageFile) return null

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", imageFile)

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      return result.imageUrl
    } catch (error) {
      console.error("Image upload error:", error)
      throw new Error("Failed to upload image: " + error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // Filter categories based on search term
  const filteredCategories = categories.filter((category) => {
    const searchLower = categorySearchTerm.toLowerCase()
    return (
      category.name.toLowerCase().includes(searchLower) ||
      category.description.toLowerCase().includes(searchLower)
    )
  })

  // Filter subcategories based on search term
  const filteredSubcategories = subcategories.filter((subcategory) => {
    const searchLower = subcategorySearchTerm.toLowerCase()
    return (
      subcategory.name.toLowerCase().includes(searchLower) ||
      (subcategory.description && subcategory.description.toLowerCase().includes(searchLower)) ||
      (subcategory.category?.name && subcategory.category.name.toLowerCase().includes(searchLower))
    )
  })

  // Pagination logic
  const totalCategoryPages = Math.ceil(filteredCategories.length / itemsPerPage)
  const totalSubcategoryPages = Math.ceil(filteredSubcategories.length / itemsPerPage)

  const paginatedCategories = filteredCategories.slice(
    (categoryPage - 1) * itemsPerPage,
    categoryPage * itemsPerPage
  )

  const paginatedSubcategories = filteredSubcategories.slice(
    (subcategoryPage - 1) * itemsPerPage,
    subcategoryPage * itemsPerPage
  )

  // Reset page when search changes
  useEffect(() => {
    setCategoryPage(1)
  }, [categorySearchTerm])

  useEffect(() => {
    setSubcategoryPage(1)
  }, [subcategorySearchTerm])


  return (
    <AdminLayout>
      <div className="w-full min-h-screen bg-gray-50 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Categories & Subcategories</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600">Manage product categories and subcategories</p>
            </div>
            <div className="w-full sm:w-auto">
              {activeTab === "subcategories" && (
                <button
                  onClick={() => {
                    resetSubcategoryForm()
                    setShowSubcategoryForm(true)
                  }}
                  className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8B6B4C] to-[#7A5D42] text-white text-sm sm:text-base font-medium rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Subcategory
                </button>
              )}
              {activeTab === "categories" && (
                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#8B6B4C] to-[#7A5D42] text-white text-sm sm:text-base font-medium rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Category
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === "categories"
                  ? "border-[#8B6B4C] text-[#8B6B4C]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab("subcategories")}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === "subcategories"
                  ? "border-[#8B6B4C] text-[#8B6B4C]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Subcategories ({subcategories.length})
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          {activeTab === "categories" && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
                placeholder="Search categories by name or description..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent"
              />
              {categorySearchTerm && (
                <button
                  onClick={() => setCategorySearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          {activeTab === "subcategories" && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={subcategorySearchTerm}
                onChange={(e) => setSubcategorySearchTerm(e.target.value)}
                placeholder="Search subcategories by name, description, or parent category..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B6B4C] focus:border-transparent"
              />
              {subcategorySearchTerm && (
                <button
                  onClick={() => setSubcategorySearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm sm:text-base text-red-600">{error}</p>
          </div>
        )}

        {/* Category Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn"
            onClick={() => setShowForm(false)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:w-full mx-0 sm:mx-4 max-h-[92vh] overflow-hidden animate-slideUp sm:animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {editingCategory ? "Edit Category" : "Add New Category"}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form
                id="categoryForm"
                onSubmit={handleSubmit}
                className="px-6 py-4 overflow-y-auto max-h-[calc(92vh-180px)] space-y-5"
              >
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Category Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none"
                      placeholder="e.g., Diamond Rings"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none resize-none"
                      placeholder="Brief description of this category"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Category Image *</label>

                    {(imagePreview || formData.image) && (
                      <div className="mb-3">
                        {imagePreview ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Category preview"
                            className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                          />
                        ) : (
                          <CldImage
                            src={formData.image}
                            width={192}
                            height={144}
                            alt="Category preview"
                            className="rounded-xl object-cover border-2 border-gray-200 w-full h-48"
                          />
                        )}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview("")
                              setFormData({ ...formData, image: "" })
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Image
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-2">
                      <input
                        type="file"
                        id="categoryImage"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="categoryImage"
                        className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-[#8B6B4C] transition-all duration-200"
                      >
                        <svg
                          className="w-5 h-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        {imageFile || formData.image ? "Change Image" : "Select Image"}
                      </label>
                      <p className="mt-2 text-xs text-gray-500 text-center">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: Number.parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-5 w-5 text-[#8B6B4C] focus:ring-[#8B6B4C] border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="isActive" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                      Active Status
                    </label>
                  </div>
                </form>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-4 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-95 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('categoryForm');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  disabled={loading || uploadingImage}
                  className="flex-1 py-3 px-4 text-sm font-medium bg-gradient-to-r from-[#8B6B4C] to-[#7A5D42] text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subcategory Form Modal */}
        {showSubcategoryForm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn"
            onClick={() => setShowSubcategoryForm(false)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:w-full mx-0 sm:mx-4 max-h-[92vh] overflow-hidden animate-slideUp sm:animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}
                  </h2>
                  <button
                    onClick={() => setShowSubcategoryForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form
                id="subcategoryForm"
                onSubmit={handleSubmitSubcategory}
                className="px-6 py-4 overflow-y-auto max-h-[calc(92vh-180px)] space-y-5"
              >
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Parent Category *</label>
                    <select
                      value={subcategoryFormData.categoryId}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, categoryId: e.target.value })}
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories
                        .filter((cat) => cat.isActive)
                        .map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Subcategory Name *
                    </label>
                    <input
                      type="text"
                      value={subcategoryFormData.name}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value })}
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none"
                      placeholder="e.g., Engagement Rings"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                    <textarea
                      value={subcategoryFormData.description}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, description: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none resize-none"
                      placeholder="Brief description of this subcategory"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Subcategory Image</label>

                    {(imagePreview || subcategoryFormData.image) && (
                      <div className="mb-3">
                        {imagePreview ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Subcategory preview"
                            className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                          />
                        ) : subcategoryFormData.image ? (
                          <CldImage
                            src={subcategoryFormData.image}
                            width={192}
                            height={144}
                            alt="Subcategory preview"
                            className="rounded-xl object-cover border-2 border-gray-200 w-full h-48"
                          />
                        ) : null}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview("")
                              setSubcategoryFormData({ ...subcategoryFormData, image: "" })
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove Image
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-2">
                      <input
                        type="file"
                        id="subcategoryImage"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="subcategoryImage"
                        className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-[#8B6B4C] transition-all duration-200"
                      >
                        <svg
                          className="w-5 h-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        {imageFile || subcategoryFormData.image ? "Change Image" : "Select Image"}
                      </label>
                      <p className="mt-2 text-xs text-gray-500 text-center">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={subcategoryFormData.order}
                      onChange={(e) =>
                        setSubcategoryFormData({ ...subcategoryFormData, order: Number.parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B6B4C]/20 focus:border-[#8B6B4C] transition-all duration-200 outline-none"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="subcategoryActive"
                      checked={subcategoryFormData.isActive}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, isActive: e.target.checked })}
                      className="h-5 w-5 text-[#8B6B4C] focus:ring-[#8B6B4C] border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="subcategoryActive" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                      Active Status
                    </label>
                  </div>
                </form>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubcategoryForm(false)}
                  className="flex-1 py-3 px-4 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-95 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('subcategoryForm');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  disabled={loading || uploadingImage}
                  className="flex-1 py-3 px-4 text-sm font-medium bg-gradient-to-r from-[#8B6B4C] to-[#7A5D42] text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : editingSubcategory ? "Update Subcategory" : "Create Subcategory"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "categories" &&
          (loading && !showForm ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shimmer"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-gray-200 rounded shimmer"></div>
                    <div className="h-3 w-1/2 bg-gray-100 rounded shimmer"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded shimmer"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {filteredCategories.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {categorySearchTerm ? "No categories found" : "No categories yet"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {categorySearchTerm
                      ? "Try adjusting your search terms"
                      : "Get started by creating your first category"}
                  </p>
                  {!categorySearchTerm && (
                    <button
                      onClick={() => {
                        resetForm()
                        setShowForm(true)
                      }}
                      className="px-3 sm:px-4 py-2 bg-[#8B6B4C] text-white text-sm rounded-lg hover:bg-[#7A5D42] transition-colors"
                    >
                      Add First Category
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Products
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedCategories.map((category) => (
                          <tr key={category._id} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <CldImage
                                  src={category.image}
                                  width={48}
                                  height={48}
                                  alt={category.name}
                                  className="rounded-lg object-cover w-8 h-8 sm:w-12 sm:h-12"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500">Sort: {category.sortOrder}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">{category.description}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{category.productsCount || 0}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  category.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {category.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 sm:space-x-3">
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-[#8B6B4C] hover:text-[#7A5D42]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(category)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {paginatedCategories.map((category) => (
                      <div key={category._id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <CldImage
                              src={category.image}
                              width={48}
                              height={48}
                              alt={category.name}
                              className="rounded-lg object-cover w-12 h-12 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{category.name}</div>
                              <div className="text-xs text-gray-500">Sort: {category.sortOrder}</div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                              category.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 line-clamp-2">{category.description}</div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">{category.productsCount || 0} products</div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEdit(category)}
                              className="text-sm text-[#8B6B4C] hover:text-[#7A5D42] font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(category)}
                              className="text-sm text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination for Categories */}
              {filteredCategories.length > itemsPerPage && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(categoryPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(categoryPage * itemsPerPage, filteredCategories.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredCategories.length}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCategoryPage((prev) => Math.max(prev - 1, 1))}
                        disabled={categoryPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCategoryPage((prev) => Math.min(prev + 1, totalCategoryPages))}
                        disabled={categoryPage === totalCategoryPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        {/* Subcategories List */}
        {activeTab === "subcategories" &&
          (loading && !showSubcategoryForm ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shimmer"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-gray-200 rounded shimmer"></div>
                    <div className="h-3 w-1/2 bg-gray-100 rounded shimmer"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded shimmer"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {filteredSubcategories.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {subcategorySearchTerm ? "No subcategories found" : "No subcategories yet"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {subcategorySearchTerm
                      ? "Try adjusting your search terms"
                      : "Create your first subcategory to organize products better"}
                  </p>
                  {!subcategorySearchTerm && (
                    <button
                      onClick={() => {
                        resetSubcategoryForm()
                        setShowSubcategoryForm(true)
                      }}
                      className="px-3 sm:px-4 py-2 bg-[#8B6B4C] text-white text-sm rounded-lg hover:bg-[#7A5D42] transition-colors"
                    >
                      Add First Subcategory
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subcategory
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parent Category
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedSubcategories.map((subcategory) => (
                          <tr key={subcategory._id} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-3">
                                {subcategory.image && (
                                  <CldImage
                                    src={subcategory.image}
                                    width={48}
                                    height={48}
                                    alt={subcategory.name}
                                    className="rounded-lg object-cover w-8 h-8 sm:w-12 sm:h-12"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
                                  <div className="text-xs sm:text-sm text-gray-500">Order: {subcategory.order}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{subcategory.category?.name || "N/A"}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {subcategory.description || "No description"}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  subcategory.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {subcategory.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 sm:space-x-3">
                              <button
                                onClick={() => handleEditSubcategory(subcategory)}
                                className="text-[#8B6B4C] hover:text-[#7A5D42]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSubcategory(subcategory)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {paginatedSubcategories.map((subcategory) => (
                      <div key={subcategory._id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {subcategory.image && (
                              <CldImage
                                src={subcategory.image}
                                width={48}
                                height={48}
                                alt={subcategory.name}
                                className="rounded-lg object-cover w-12 h-12 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{subcategory.name}</div>
                              <div className="text-xs text-gray-500">{subcategory.category?.name || "N/A"}</div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                              subcategory.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {subcategory.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                          {subcategory.description || "No description"}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">Order: {subcategory.order}</div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEditSubcategory(subcategory)}
                              className="text-sm text-[#8B6B4C] hover:text-[#7A5D42] font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(subcategory)}
                              className="text-sm text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination for Subcategories */}
              {filteredSubcategories.length > itemsPerPage && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(subcategoryPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(subcategoryPage * itemsPerPage, filteredSubcategories.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredSubcategories.length}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSubcategoryPage((prev) => Math.max(prev - 1, 1))}
                        disabled={subcategoryPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSubcategoryPage((prev) => Math.min(prev + 1, totalSubcategoryPages))}
                        disabled={subcategoryPage === totalSubcategoryPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </AdminLayout>
  )
}

export default withAdminAuth(CategoriesAdmin)
