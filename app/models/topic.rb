class Topic < ActiveRecord::Base
  has_many :likes, as: :likable
  validates :name, presence: true

  has_many :history
  has_many :sources, through: :history
  has_many :users, through: :history
end