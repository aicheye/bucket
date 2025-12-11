/**
 * Shared item form modal for adding/editing items
 * Used in both dashboard and grades pages
 */

import type { Course, Item, ItemFormData } from "../../../lib/types";
import Modal from "../ui/Modal";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem: Item | null;
  addingItemCourseId: string | null;
  itemData: ItemFormData;
  setItemData: (data: ItemFormData) => void;
  courses: Course[];
  getCourseTypes: (courseId: string) => string[];
  categoryHasMarks?: (courseId: string, type: string) => boolean;
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  addingItemCourseId,
  itemData,
  setItemData,
  courses,
  getCourseTypes,
  categoryHasMarks,
}: ItemFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "Edit Item" : "Add Item"}
      onConfirm={onSave}
      actions={
        <>
          <button className="btn" onClick={onClose} title="Cancel">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} title="Save">
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {editingItem === null &&
          addingItemCourseId === null &&
          courses.length > 0 && (
            <div className="form-control w-full">
              <label className="label mb-2">
                <span className="label-text">Course</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={itemData.course_id || ""}
                onChange={(e) => {
                  const newCourseId = e.target.value;
                  const types = getCourseTypes(newCourseId);
                  setItemData({
                    ...itemData,
                    course_id: newCourseId,
                    type: types[0] || "Assignment",
                  });
                }}
              >
                <option disabled value="">
                  Select a course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          )}
        <div className="form-control w-full">
          <label className="label mb-2">
            <span className="label-text">Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={itemData.name}
            disabled={itemData.isPlaceholder}
            onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
          />
        </div>
        <div className="form-control w-full">
          <label className="label mb-2 flex items-center gap-2">
            <span className="label-text">Type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={itemData.type}
            onChange={(e) => {
              const newType = e.target.value;
              const selectedCourseId = addingItemCourseId || itemData.course_id || "";

              // If currently creating a placeholder, check whether the
              // newly selected type can have placeholders (i.e. already has marks).
              if (itemData.isPlaceholder) {
                const hasMarks =
                  typeof categoryHasMarks === "function" && selectedCourseId
                    ? categoryHasMarks(selectedCourseId, newType)
                    : false;

                if (hasMarks) {
                  // New type already has marks -> disable placeholder and reset fields
                  setItemData({
                    ...itemData,
                    type: newType,
                    isPlaceholder: false,
                    name: "",
                    max_grade: "",
                  });
                } else {
                  // Still a placeholder -> keep placeholder name and locked max
                  setItemData({
                    ...itemData,
                    type: newType,
                    name: `${newType} Placeholder`,
                    max_grade: "100",
                  });
                }
              } else {
                setItemData({ ...itemData, type: newType });
              }
            }}
          >
            {(addingItemCourseId || itemData.course_id) &&
              getCourseTypes(
                addingItemCourseId || itemData.course_id || "",
              ).map((t: string) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {editingItem === null && (() => {
          const selectedCourseId = addingItemCourseId || itemData.course_id || "";
          const shouldShow =
            selectedCourseId &&
            (typeof categoryHasMarks === "function"
              ? !categoryHasMarks(selectedCourseId, itemData.type)
              : true);
          if (!shouldShow) return null;

          return (
            <div className="form-control w-full">
              <label className="label mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={!!itemData.isPlaceholder}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      isPlaceholder: e.target.checked,
                      due_date: e.target.checked ? "" : itemData.due_date,
                      name: e.target.checked ? `${itemData.type} Placeholder` : itemData.name,
                      max_grade: e.target.checked ? "100" : itemData.max_grade,
                    })
                  }
                />
                <span className="label-text">Create as placeholder</span>
              </label>
            </div>
          );
        })()}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-control w-full">
            <label className="label mb-2">
              <span className="label-text">Grade</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={itemData.grade}
              onChange={(e) =>
                setItemData({ ...itemData, grade: e.target.value })
              }
            />
          </div>
          <div className="form-control w-full">
            <label className="label mb-2">
              <span className="label-text">Max Grade</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={itemData.isPlaceholder ? "100" : itemData.max_grade}
              disabled={!!itemData.isPlaceholder}
              onChange={(e) =>
                !itemData.isPlaceholder && setItemData({ ...itemData, max_grade: e.target.value })
              }
            />
          </div>
        </div>
        {!itemData.isPlaceholder && (
          <div className="form-control w-full">
            <label className="label mb-2">
              <span className="label-text">Due Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={itemData.due_date?.split("T")[0] ?? ""}
              onChange={(e) =>
                setItemData({ ...itemData, due_date: e.target.value })
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Test skeleton for ItemFormModal
 *
 * @jest-environment jsdom
 */
// describe("ItemFormModal", () => {
//   it("should show 'Add Item' title when adding", () => {
//     // TODO: Implement test
//   });
//
//   it("should show 'Edit Item' title when editing", () => {
//     // TODO: Implement test
//   });
//
//   it("should show course selector when no course preselected", () => {
//     // TODO: Implement test
//   });
//
//   it("should populate fields when editing", () => {
//     // TODO: Implement test
//   });
//
//   it("should call onSave when save button clicked", () => {
//     // TODO: Implement test
//   });
//
//   it("should call onClose when cancel button clicked", () => {
//     // TODO: Implement test
//   });
// });
